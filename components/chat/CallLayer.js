'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import Mascot from '../Mascot';
import { api } from '@/lib/clientUpload';
import { ringtone, blip } from '@/lib/chatClient';

// Κλήσεις WebRTC 1-προς-1 μεταξύ φίλων. Ήχος/εικόνα πάνε ΑΠΕΥΘΕΙΑΣ μεταξύ των δύο συσκευών, κρυπτογραφημένα (DTLS-SRTP).
// Σηματοδοσία χωρίς «trickle»: περιμένουμε να μαζευτούν οι υποψήφιοι ICE και στέλνουμε ένα μόνο μήνυμα offer/answer.
const gather = (pc) => new Promise((res) => { if (pc.iceGatheringState === 'complete') return res(); const t = setTimeout(res, 3500); pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); res(); } }); });
const fmtT = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
let iceCache = null;
const iceServers = async () => (iceCache ||= (await api('/api/chat/ice').catch(() => ({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }))).iceServers);

const CallLayer = forwardRef(function CallLayer({ me, features }, ref) {
  const [call, setCall] = useState(null);   // { state: 'calling'|'ringing'|'connecting'|'live', peer, video, callId, callDb, offerSdp }
  const [mic, setMic] = useState(true), [cam, setCam] = useState(true), [secs, setSecs] = useState(0), [err, setErr] = useState('');
  const pc = useRef(null), local = useRef(null), remote = useRef(null), lv = useRef(null), rv = useRef(null), ra = useRef(null), stopRing = useRef(null), timeout = useRef(null), cur = useRef(null);
  cur.current = call;

  const cleanup = () => {
    stopRing.current?.(); stopRing.current = null; clearTimeout(timeout.current);
    try { pc.current?.close(); } catch {} pc.current = null;
    local.current?.getTracks().forEach((t) => t.stop()); local.current = null; remote.current = null;
    setSecs(0); setMic(true); setCam(true);
  };
  const end = async (notify = true, kind = 'end') => {
    const c = cur.current; if (!c) return;
    if (notify) api('/api/chat/call', { method: 'POST', body: { to: c.peer.id, kind, callId: c.callId, callDb: c.callDb } }).catch(() => {});
    cleanup(); setCall(null); blip(420, 0.25, 0.08);
  };
  const media = async (video) => {
    try { return await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: video ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false }); }
    catch { throw new Error(video ? 'Χρειάζεται άδεια για μικρόφωνο και κάμερα. Επίτρεψέ τα από τη γραμμή διευθύνσεων του browser.' : 'Χρειάζεται άδεια για το μικρόφωνο. Επίτρεψέ το από τη γραμμή διευθύνσεων του browser.'); }
  };
  const makePc = async () => {
    const p = new RTCPeerConnection({ iceServers: await iceServers() });
    p.ontrack = (e) => { remote.current = e.streams[0]; if (rv.current) rv.current.srcObject = e.streams[0]; if (ra.current) ra.current.srcObject = e.streams[0]; };
    p.onconnectionstatechange = () => {
      if (p.connectionState === 'connected') { setCall((c) => c && { ...c, state: 'live' }); stopRing.current?.(); }
      if (['failed', 'disconnected', 'closed'].includes(p.connectionState) && cur.current?.state === 'live') { if (p.connectionState === 'failed') setErr('Η σύνδεση χάθηκε.'); end(p.connectionState !== 'closed'); }
    };
    local.current.getTracks().forEach((t) => p.addTrack(t, local.current));
    pc.current = p; return p;
  };

  useImperativeHandle(ref, () => ({
    /** Εξερχόμενη κλήση */
    async start(peer, video) {
      if (cur.current) return; setErr('');
      if (!features.calls) return setErr('Οι κλήσεις είναι κλειστές.');
      const callId = crypto.randomUUID();
      setCall({ state: 'calling', peer, video, callId });
      try {
        local.current = await media(video); if (lv.current) lv.current.srcObject = local.current;
        const p = await makePc(); await p.setLocalDescription(await p.createOffer()); await gather(p);
        const r = await api('/api/chat/call', { method: 'POST', body: { to: peer.id, kind: 'offer', video, callId, sdp: p.localDescription.sdp } });
        setCall((c) => c && { ...c, callDb: r.callDb });
        stopRing.current = ringtone();
        timeout.current = setTimeout(() => { if (cur.current?.state === 'calling') { setErr('Δεν απάντησε.'); end(true); } }, 40000);
      } catch (e) { setErr(e.message); cleanup(); setCall(null); }
    },
    /** Εισερχόμενο σήμα (από Ably ή polling) */
    async signal(s) {
      const d = s.data || {}, c = cur.current;
      if (s.kind === 'call:offer') {
        if (c) { api('/api/chat/call', { method: 'POST', body: { to: s.from, kind: 'busy', callId: d.callId, callDb: d.callDb } }).catch(() => {}); return; }
        if (!me.allowCalls) return;
        setErr(''); setCall({ state: 'ringing', peer: { id: s.from, nickname: d.nick, avatar: d.avatar }, video: !!d.video, callId: d.callId, callDb: d.callDb, offerSdp: d.sdp });
        stopRing.current = ringtone();
        timeout.current = setTimeout(() => { if (cur.current?.state === 'ringing') { cleanup(); setCall(null); } }, 45000);
        try { if (Notification?.permission === 'granted' && document.visibilityState !== 'visible') new Notification(`📞 Κλήση από ${d.nick}`); } catch {}
        return;
      }
      if (!c || d.callId !== c.callId) return;
      if (s.kind === 'call:answer' && c.state === 'calling') { stopRing.current?.(); clearTimeout(timeout.current); setCall({ ...c, state: 'connecting' }); try { await pc.current.setRemoteDescription({ type: 'answer', sdp: d.sdp }); } catch { setErr('Η σύνδεση απέτυχε.'); end(true); } }
      if (s.kind === 'call:decline') { setErr(`Ο/Η ${c.peer.nickname} απέρριψε την κλήση.`); end(false); }
      if (s.kind === 'call:busy') { setErr(`Ο/Η ${c.peer.nickname} είναι σε άλλη κλήση.`); end(false); }
      if (s.kind === 'call:end') end(false);
    },
  }), [features, me]); // eslint-disable-line

  const accept = async () => {
    const c = cur.current; stopRing.current?.(); clearTimeout(timeout.current); setCall({ ...c, state: 'connecting' }); setErr('');
    try {
      local.current = await media(c.video); if (lv.current) lv.current.srcObject = local.current;
      const p = await makePc(); await p.setRemoteDescription({ type: 'offer', sdp: c.offerSdp }); await p.setLocalDescription(await p.createAnswer()); await gather(p);
      await api('/api/chat/call', { method: 'POST', body: { to: c.peer.id, kind: 'answer', callId: c.callId, callDb: c.callDb, sdp: p.localDescription.sdp, video: c.video } });
    } catch (e) { setErr(e.message); end(true); }
  };
  useEffect(() => { if (call?.state !== 'live') return; const t = setInterval(() => setSecs((x) => x + 1), 1000); return () => clearInterval(t); }, [call?.state]);
  useEffect(() => { if (lv.current && local.current) lv.current.srcObject = local.current; if (rv.current && remote.current) rv.current.srcObject = remote.current; if (ra.current && remote.current) ra.current.srcObject = remote.current; });
  useEffect(() => () => cleanup(), []); // eslint-disable-line
  const toggle = (kind) => { const tr = local.current?.getTracks().filter((t) => t.kind === kind) || []; tr.forEach((t) => { t.enabled = !t.enabled; }); if (kind === 'audio') setMic((x) => !x); else setCam((x) => !x); };

  if (!call) return err ? <div className="cx-toast" role="status" onAnimationEnd={() => setErr('')}>{err}</div> : null;
  const label = { calling: 'Κλήση…', ringing: call.video ? 'Εισερχόμενη βιντεοκλήση' : 'Εισερχόμενη κλήση', connecting: 'Σύνδεση…', live: fmtT(secs) }[call.state];
  return (
    <div className={`cx-call ${call.state}${call.video ? ' video' : ''}`} role="dialog" aria-modal="true" aria-label={`Κλήση με ${call.peer.nickname}`}>
      {call.video && call.state !== 'ringing' && <video ref={rv} className="cx-rv" autoPlay playsInline />}
      {!call.video && <audio ref={ra} autoPlay />}
      <div className="cx-call-who"><span className="cx-call-av"><Mascot mood={call.peer.avatar || 'happy'} size={call.video && call.state === 'live' ? 64 : 120} /></span><h2>{call.peer.nickname}</h2><p>{label}</p></div>
      {call.video && call.state !== 'ringing' && <video ref={lv} className="cx-lv" autoPlay playsInline muted />}
      {err && <p className="cx-call-err">{err}</p>}
      <div className="cx-call-ctl">
        {call.state === 'ringing' ? <>
          <button type="button" className="cx-cb no" onClick={() => end(true, 'decline')} aria-label="Απόρριψη">✕</button>
          <button type="button" className="cx-cb yes" onClick={accept} aria-label="Απάντηση">{call.video ? '🎥' : '📞'}</button>
        </> : <>
          <button type="button" className={`cx-cb${mic ? '' : ' off'}`} onClick={() => toggle('audio')} aria-label={mic ? 'Σίγαση' : 'Άρση σίγασης'}>{mic ? '🎙️' : '🔇'}</button>
          {call.video && <button type="button" className={`cx-cb${cam ? '' : ' off'}`} onClick={() => toggle('video')} aria-label={cam ? 'Κλείσιμο κάμερας' : 'Άνοιγμα κάμερας'}>{cam ? '📷' : '🚫'}</button>}
          <button type="button" className="cx-cb no" onClick={() => end(true)} aria-label="Τερματισμός">📵</button>
        </>}
      </div>
      <p className="cx-call-lock">🔒 Η κλήση πάει απευθείας και κρυπτογραφημένη ανάμεσα στις δύο συσκευές.</p>
    </div>
  );
});
export default CallLayer;
