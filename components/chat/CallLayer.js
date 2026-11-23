'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import Mascot from '../Mascot';
import Icon from '../Icons';
import { api } from '@/lib/clientUpload';
import { ringtone, blip } from '@/lib/chatClient';

// Κλήσεις WebRTC 1-προς-1 μεταξύ φίλων. Ήχος/εικόνα πάνε ΑΠΕΥΘΕΙΑΣ μεταξύ των συσκευών, κρυπτογραφημένα (DTLS-SRTP).
// «Trickle ICE»: η πρόταση κλήσης φεύγει αμέσως και οι διαδρομές σύνδεσης (ICE) στέλνονται σε μικρές δέσμες καθώς βρίσκονται,
// ώστε η κλήση να ξεκινά σε λιγότερο από ένα δευτερόλεπτο. Με TURN (Cloudflare) η κλήση περνά και από αυστηρά δίκτυα.
const fmtT = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
let iceCache = null, iceAt = 0;
const iceServers = async () => {
  if (!iceCache || Date.now() - iceAt > 30 * 60000) { iceCache = (await api('/api/chat/ice').catch(() => ({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }))).iceServers; iceAt = Date.now(); }
  return iceCache;
};
const post = (body, keepalive) => (keepalive
  ? fetch('/api/chat/call', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {})
  : api('/api/chat/call', { method: 'POST', body }));

const CallLayer = forwardRef(function CallLayer({ me, features }, ref) {
  const [call, setCall] = useState(null);   // { state: 'calling'|'ringing'|'connecting'|'live', peer, video, callId, callDb, offerSdp }
  const [mic, setMic] = useState(true), [cam, setCam] = useState(true), [secs, setSecs] = useState(0), [err, setErr] = useState(''), [quality, setQuality] = useState('');
  const pc = useRef(null), local = useRef(null), remote = useRef(null), lv = useRef(null), rv = useRef(null), ra = useRef(null);
  const stopRing = useRef(null), timeout = useRef(null), cur = useRef(null), pendingIce = useRef([]), outIce = useRef([]), flushT = useRef(null);
  cur.current = call;

  const cleanup = () => {
    stopRing.current?.(); stopRing.current = null; clearTimeout(timeout.current); clearTimeout(flushT.current);
    try { pc.current?.close(); } catch {} pc.current = null;
    local.current?.getTracks().forEach((t) => t.stop()); local.current = null; remote.current = null;
    pendingIce.current = []; outIce.current = []; setSecs(0); setMic(true); setCam(true); setQuality('');
  };
  const end = (notify = true, kind = 'end', keepalive = false) => {
    const c = cur.current; if (!c) return;
    if (notify) Promise.resolve(post({ to: c.peer.id, kind, callId: c.callId, callDb: c.callDb }, keepalive)).catch(() => {});
    cleanup(); setCall(null); blip(420, 0.25, 0.06);
  };
  // κλείσιμο καρτέλας κατά τη διάρκεια κλήσης → ενημέρωση του άλλου
  useEffect(() => { const h = () => { if (cur.current) end(true, 'end', true); }; window.addEventListener('pagehide', h); return () => window.removeEventListener('pagehide', h); }, []); // eslint-disable-line

  const media = async (video) => {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Ο browser δεν υποστηρίζει κλήσεις σε αυτή τη σελίδα (χρειάζεται https).');
    try { return await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: video ? { width: { ideal: 960 }, height: { ideal: 540 }, frameRate: { ideal: 24 }, facingMode: 'user' } : false }); }
    catch (e) {
      if (e?.name === 'NotFoundError') throw new Error(video ? 'Δεν βρέθηκε μικρόφωνο ή κάμερα.' : 'Δεν βρέθηκε μικρόφωνο.');
      throw new Error(video ? 'Χρειάζεται άδεια για μικρόφωνο και κάμερα. Πάτα το λουκέτο δίπλα στη διεύθυνση και επίτρεψέ τα.' : 'Χρειάζεται άδεια για το μικρόφωνο. Πάτα το λουκέτο δίπλα στη διεύθυνση και επίτρεψέ το.');
    }
  };
  const flushIce = () => {
    const x = cur.current, list = outIce.current.splice(0, 30);
    if (x && list.length) post({ to: x.peer.id, kind: 'ice', callId: x.callId, callDb: x.callDb, candidates: list }).catch(() => {});
    if (outIce.current.length) flushT.current = setTimeout(flushIce, 150);
  };
  const sendIce = (c) => { outIce.current.push(JSON.stringify(c)); clearTimeout(flushT.current); flushT.current = setTimeout(flushIce, 120); };
  const makePc = async () => {
    const p = new RTCPeerConnection({ iceServers: await iceServers(), bundlePolicy: 'max-bundle' });
    p.onicecandidate = (e) => { if (e.candidate) sendIce(e.candidate.toJSON()); };
    p.ontrack = (e) => { remote.current = e.streams[0]; if (rv.current) rv.current.srcObject = e.streams[0]; if (ra.current) ra.current.srcObject = e.streams[0]; };
    p.onconnectionstatechange = () => {
      const s = p.connectionState;
      if (s === 'connected') { setCall((c) => c && { ...c, state: 'live' }); stopRing.current?.(); setErr(''); }
      if (s === 'disconnected') setQuality('Η σύνδεση είναι ασταθής…');
      if (s === 'failed') { setErr('Η κλήση δεν μπόρεσε να συνδεθεί. Το δίκτυο μάλλον μπλοκάρει τις κλήσεις (π.χ. σχολικό Wi-Fi).'); end(true); }
    };
    p.oniceconnectionstatechange = () => { if (p.iceConnectionState === 'connected' || p.iceConnectionState === 'completed') setQuality(''); };
    local.current.getTracks().forEach((t) => p.addTrack(t, local.current));
    pc.current = p; return p;
  };
  const addRemoteIce = async (list) => {
    for (const s of list || []) { try { const c = JSON.parse(s); if (pc.current?.remoteDescription) await pc.current.addIceCandidate(c); else pendingIce.current.push(c); } catch {} }
  };
  const flushPending = async () => { const l = pendingIce.current.splice(0); for (const c of l) { try { await pc.current.addIceCandidate(c); } catch {} } };

  useImperativeHandle(ref, () => ({
    /** Εξερχόμενη κλήση */
    async start(peer, video) {
      if (cur.current) return; setErr('');
      if (!features.calls) { setErr('Οι κλήσεις είναι κλειστές.'); return; }
      const callId = crypto.randomUUID();
      setCall({ state: 'calling', peer, video, callId }); cur.current = { state: 'calling', peer, video, callId };
      try {
        local.current = await media(video); if (lv.current) lv.current.srcObject = local.current;
        const p = await makePc(); await p.setLocalDescription(await p.createOffer());
        const r = await post({ to: peer.id, kind: 'offer', video, callId, sdp: p.localDescription.sdp });
        cur.current = { ...cur.current, callDb: r.callDb }; setCall((c) => c && { ...c, callDb: r.callDb });
        stopRing.current = ringtone();
        timeout.current = setTimeout(() => { if (cur.current?.state === 'calling') { setErr(`Ο/Η ${peer.nickname} δεν απάντησε.`); end(true); } }, 40000);
      } catch (e) { setErr(e.message); cleanup(); setCall(null); }
    },
    /** Εισερχόμενο σήμα (Ably ή polling) */
    async signal(s) {
      const d = s.data || {}, c = cur.current;
      if (s.kind === 'call:offer') {
        if (c) { if (d.callId !== c.callId) post({ to: s.from, kind: 'busy', callId: d.callId, callDb: d.callDb }).catch(() => {}); return; }
        if (!me.allowCalls) return;
        setErr(''); const nc = { state: 'ringing', peer: { id: s.from, nickname: d.nick, avatar: d.avatar }, video: !!d.video, callId: d.callId, callDb: d.callDb, offerSdp: d.sdp };
        setCall(nc); cur.current = nc; stopRing.current = ringtone();
        timeout.current = setTimeout(() => { if (cur.current?.state === 'ringing') { cleanup(); setCall(null); } }, 45000);
        try { if (window.Notification?.permission === 'granted' && document.visibilityState !== 'visible') new Notification(`Κλήση από ${d.nick}`); } catch {}
        return;
      }
      if (!c || d.callId !== c.callId) return;
      if (s.kind === 'call:ice') { await addRemoteIce(d.candidates); return; }
      if (s.kind === 'call:answer' && c.state === 'calling') {
        stopRing.current?.(); clearTimeout(timeout.current); setCall({ ...c, state: 'connecting' }); cur.current = { ...c, state: 'connecting' };
        try { await pc.current.setRemoteDescription({ type: 'answer', sdp: d.sdp }); await flushPending(); } catch { setErr('Η σύνδεση απέτυχε.'); end(true); }
        timeout.current = setTimeout(() => { if (cur.current?.state === 'connecting') { setErr('Η κλήση δεν μπόρεσε να συνδεθεί. Το δίκτυο μάλλον μπλοκάρει τις κλήσεις.'); end(true); } }, 25000);
      }
      if (s.kind === 'call:decline') { setErr(`Ο/Η ${c.peer.nickname} απέρριψε την κλήση.`); end(false); }
      if (s.kind === 'call:busy') { setErr(`Ο/Η ${c.peer.nickname} είναι σε άλλη κλήση.`); end(false); }
      if (s.kind === 'call:end') { if (c.state === 'ringing') { cleanup(); setCall(null); } else end(false); }
    },
  }), [features, me]); // eslint-disable-line

  const accept = async () => {
    const c = cur.current; stopRing.current?.(); clearTimeout(timeout.current);
    const nc = { ...c, state: 'connecting' }; setCall(nc); cur.current = nc; setErr('');
    try {
      local.current = await media(c.video); if (lv.current) lv.current.srcObject = local.current;
      const p = await makePc(); await p.setRemoteDescription({ type: 'offer', sdp: c.offerSdp }); await flushPending();
      await p.setLocalDescription(await p.createAnswer());
      await post({ to: c.peer.id, kind: 'answer', callId: c.callId, callDb: c.callDb, sdp: p.localDescription.sdp, video: c.video });
      timeout.current = setTimeout(() => { if (cur.current?.state === 'connecting') { setErr('Η κλήση δεν μπόρεσε να συνδεθεί. Το δίκτυο μάλλον μπλοκάρει τις κλήσεις.'); end(true); } }, 25000);
    } catch (e) { setErr(e.message); end(true); }
  };
  useEffect(() => { if (call?.state !== 'live') return; clearTimeout(timeout.current); const t = setInterval(() => setSecs((x) => x + 1), 1000); return () => clearInterval(t); }, [call?.state]);
  useEffect(() => { if (lv.current && local.current && lv.current.srcObject !== local.current) lv.current.srcObject = local.current; if (rv.current && remote.current && rv.current.srcObject !== remote.current) rv.current.srcObject = remote.current; if (ra.current && remote.current && ra.current.srcObject !== remote.current) ra.current.srcObject = remote.current; });
  useEffect(() => () => cleanup(), []); // eslint-disable-line
  const toggle = (kind) => { const tr = local.current?.getTracks().filter((t) => t.kind === kind) || []; tr.forEach((t) => { t.enabled = !t.enabled; }); if (kind === 'audio') setMic((x) => !x); else setCam((x) => !x); };

  if (!call) return err ? <div className="pc-toast" role="status" key={err} onAnimationEnd={() => setErr('')}>{err}</div> : null;
  const label = { calling: 'Καλεί…', ringing: call.video ? 'Βιντεοκλήση' : 'Φωνητική κλήση', connecting: 'Σύνδεση…', live: fmtT(secs) }[call.state];
  const showVideo = call.video && call.state !== 'ringing';
  return (
    <div className={`pc-call ${call.state}${call.video ? ' video' : ''}`} role="dialog" aria-modal="true" aria-label={`Κλήση με ${call.peer.nickname}`}>
      {showVideo && <video ref={rv} className="pc-rv" autoPlay playsInline />}
      {!call.video && <audio ref={ra} autoPlay />}
      <div className="pc-call-who">
        <span className="pc-call-av"><Mascot mood={call.peer.avatar || 'happy'} size={call.video && call.state === 'live' ? 44 : 112} /></span>
        <div><h2>{call.peer.nickname}</h2><p>{label}{quality && <span className="pc-call-q"> · {quality}</span>}</p></div>
      </div>
      {showVideo && <video ref={lv} className="pc-lv" autoPlay playsInline muted />}
      {err && <p className="pc-call-err">{err}</p>}
      <div className="pc-call-ctl">
        {call.state === 'ringing' ? <>
          <button type="button" className="pc-cb decline" onClick={() => end(true, 'decline')}><Icon name="hangup" size={26} /><span>Απόρριψη</span></button>
          <button type="button" className="pc-cb accept" onClick={accept}><Icon name={call.video ? 'video' : 'phone'} size={24} /><span>Απάντηση</span></button>
        </> : <>
          <button type="button" className={`pc-cb${mic ? '' : ' off'}`} onClick={() => toggle('audio')} aria-pressed={!mic}><Icon name={mic ? 'mic' : 'micOff'} size={22} /><span>{mic ? 'Σίγαση' : 'Ήχος'}</span></button>
          {call.video && <button type="button" className={`pc-cb${cam ? '' : ' off'}`} onClick={() => toggle('video')} aria-pressed={!cam}><Icon name={cam ? 'video' : 'videoOff'} size={22} /><span>Κάμερα</span></button>}
          <button type="button" className="pc-cb decline" onClick={() => end(true)}><Icon name="hangup" size={26} /><span>Τέλος</span></button>
        </>}
      </div>
      <p className="pc-call-lock"><Icon name="lock" size={13} /> Κρυπτογραφημένη κλήση, απευθείας ανάμεσα στις δύο συσκευές</p>
    </div>
  );
});
export default CallLayer;
