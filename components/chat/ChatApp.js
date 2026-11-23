'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Mascot from '../Mascot';
import { api } from '@/lib/clientUpload';
import { connectRealtime, blip } from '@/lib/chatClient';
import { e2eSupported, myDevice, encryptFor, decryptMsg } from '@/lib/e2e';
import { moderate } from '@/lib/community.mjs';
import { MessageList, Composer } from './Messages';
import CallLayer from './CallLayer';
import { Explore, RulesModal } from './Explore';

const parseHash = () => { const h = (typeof location !== 'undefined' ? location.hash : '').replace(/^#\/?/, ''); const [k, id] = h.split('/'); return k === 'ch' ? { t: 'ch', id: +id } : k === 'dm' ? { t: 'dm', id: +id || 0 } : k === 'explore' ? { t: 'explore' } : { t: 'home' }; };
const go = (v) => { location.hash = v.t === 'ch' ? `#ch/${v.id}` : v.t === 'dm' ? (v.id ? `#dm/${v.id}` : '#dm') : v.t === 'explore' ? '#explore' : ''; };

/** Η εφαρμογή chat (τύπου Discord): servers αριστερά, κανάλια/DM, μηνύματα, μέλη, κλήσεις. */
export default function ChatApp({ siteUrl }) {
  const [boot, setBoot] = useState(null), [err, setErr] = useState(''), [view, setView] = useState({ t: 'home' }), [rt, setRt] = useState(false);
  const [msgs, setMsgs] = useState({}), [typing, setTyping] = useState({}), [members, setMembers] = useState([]), [drawer, setDrawer] = useState(false), [showMembers, setShowMembers] = useState(true);
  const [dmMsgs, setDmMsgs] = useState({}), [dmSeen, setDmSeen] = useState({}), [rules, setRules] = useState(null), [e2eErr, setE2eErr] = useState(''), [settings, setSettings] = useState(false);
  const callRef = useRef(null), sigAfter = useRef(0), seenSig = useRef(new Set()), bootRef = useRef(null), viewRef = useRef(view);
  bootRef.current = boot; viewRef.current = view;

  const loadBoot = useCallback(() => api('/api/chat/bootstrap').then((b) => { setBoot(b); return b; }).catch((e) => setErr(e.message)), []);
  useEffect(() => { loadBoot(); const on = () => setView(parseHash()); on(); window.addEventListener('hashchange', on); return () => window.removeEventListener('hashchange', on); }, [loadBoot]);
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') { setRules(null); setSettings(false); setDrawer(false); } }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  // κλειδιά E2E της συσκευής
  useEffect(() => { if (!boot?.me) return; if (!e2eSupported()) { setE2eErr('Αυτός ο browser δεν υποστηρίζει κρυπτογράφηση. Δοκίμασε Chrome, Edge, Firefox ή Safari (με https).'); return; } myDevice(boot.me.id).catch(() => setE2eErr('Δεν ήταν δυνατή η δημιουργία κλειδιών κρυπτογράφησης σε αυτή τη συσκευή.')); }, [boot?.me?.id]); // eslint-disable-line
  // presence + ανανέωση αδιάβαστων
  useEffect(() => { const t = setInterval(() => { if (document.visibilityState === 'visible') { api('/api/chat/ping', { method: 'POST', body: {} }).catch(() => {}); loadBoot(); } }, 45000); return () => clearInterval(t); }, [loadBoot]);

  const me = boot?.me;
  const channel = useMemo(() => (view.t === 'ch' ? boot?.servers.flatMap((s) => s.channels.map((c) => ({ ...c, server: s }))).find((c) => c.id === view.id) : null), [boot, view]);
  const server = channel?.server || (view.t === 'ch' ? null : null);
  const friend = view.t === 'dm' && view.id ? boot?.friends.find((f) => f.id === view.id) : null;

  /* ---------------- κανάλια ---------------- */
  const lastId = (list) => (list?.length ? list[list.length - 1].id : 0);
  const loadChannel = useCallback(async (id, after) => {
    const r = await api(`/api/chat/channels/${id}${after ? `?after=${after}` : ''}`);
    setMsgs((m) => { const cur = after ? m[id] || [] : []; const add = r.messages.filter((x) => !cur.some((y) => y.id === x.id)); return { ...m, [id]: [...cur, ...add.map((x) => ({ ...x, fresh: !!after }))] }; });
    if (!after) setBoot((b) => b && { ...b, servers: b.servers.map((s) => ({ ...s, channels: s.channels.map((c) => (c.id === id ? { ...c, unread: 0 } : c)) })) });
    return r;
  }, []);
  useEffect(() => { if (channel) { loadChannel(channel.id).catch((e) => setErr(e.message)); api(`/api/chat/members?server=${channel.server.id}`).then(setMembers).catch(() => {}); } }, [channel?.id]); // eslint-disable-line
  const olderChannel = async () => { const list = msgs[channel.id] || []; if (!list.length) return false; const r = await api(`/api/chat/channels/${channel.id}?before=${list[0].id}`); setMsgs((m) => ({ ...m, [channel.id]: [...r.messages, ...(m[channel.id] || [])] })); return r.more; };

  /* ---------------- DM (E2E) ---------------- */
  const decryptList = useCallback(async (list) => Promise.all(list.map(async (m) => (m.enc ? { ...m, text: await decryptMsg(bootRef.current.me.id, m.enc), e2e: true } : { ...m, text: m.body, e2e: false }))), []);
  const loadDm = useCallback(async (fid, after) => {
    const r = await api(`/api/chat/dm/${fid}${after ? `?after=${after}` : ''}`); const list = await decryptList(r.messages);
    setDmMsgs((d) => { const cur = after ? d[fid] || [] : []; return { ...d, [fid]: [...cur, ...list.filter((x) => !cur.some((y) => y.id === x.id)).map((x) => ({ ...x, fresh: !!after }))] }; });
    setDmSeen((s) => ({ ...s, [fid]: r.seenUpTo }));
    setBoot((b) => b && { ...b, friends: b.friends.map((f) => (f.id === fid ? { ...f, unread: 0 } : f)) });
  }, [decryptList]);
  useEffect(() => { if (friend && me) myDevice(me.id).then(() => loadDm(friend.id)).catch((e) => setErr(e.message)); }, [friend?.id, me?.id]); // eslint-disable-line

  /* ---------------- πραγματικός χρόνος ---------------- */
  const typingTimers = useRef({});
  const showTyping = (key, who) => { if (who.uid === bootRef.current?.me.id) return; setTyping((t) => ({ ...t, [key]: { ...(t[key] || {}), [who.uid]: who.nick } }));
    clearTimeout(typingTimers.current[key + who.uid]); typingTimers.current[key + who.uid] = setTimeout(() => setTyping((t) => { const x = { ...(t[key] || {}) }; delete x[who.uid]; return { ...t, [key]: x }; }), 4500); };
  const onSignal = useCallback((s) => {
    if (seenSig.current.has(s.id)) return; seenSig.current.add(s.id); sigAfter.current = Math.max(sigAfter.current, s.id);
    if (s.kind.startsWith('call:')) callRef.current?.signal(s);
    else if (s.kind === 'dm') { const v = viewRef.current; if (v.t === 'dm' && v.id === s.from) loadDm(s.from, lastId(dmMsgsRef.current[s.from])); else { blip(740); setBoot((b) => b && { ...b, friends: b.friends.map((f) => (f.id === s.from ? { ...f, unread: (f.unread || 0) + 1 } : f)) }); } }
  }, [loadDm]);
  const dmMsgsRef = useRef(dmMsgs); dmMsgsRef.current = dmMsgs; const msgsRef = useRef(msgs); msgsRef.current = msgs;
  const onEvent = useCallback(async (chan, name, d) => {
    const v = viewRef.current;
    if (chan.startsWith('ch:')) {
      const id = +chan.slice(3);
      if (name === 'msg') { if (d.uid !== bootRef.current?.me.id) blip(1040, 0.07, 0.04); setMsgs((m) => (m[id]?.some((x) => x.id === d.id) ? m : { ...m, [id]: [...(m[id] || []), { ...d, fresh: true }] })); setTyping((t) => { const x = { ...(t['ch' + id] || {}) }; delete x[d.uid]; return { ...t, ['ch' + id]: x }; }); }
      else if (name === 'edit') setMsgs((m) => ({ ...m, [id]: (m[id] || []).map((x) => (x.id === d.id ? { ...x, ...d, fresh: false } : x)) }));
      else if (name === 'del') setMsgs((m) => ({ ...m, [id]: (m[id] || []).map((x) => (x.id === d.id ? { ...x, deleted: true, body: '' } : x)) }));
      else if (name === 'react') setMsgs((m) => ({ ...m, [id]: (m[id] || []).map((x) => (x.id === d.id ? { ...x, reactions: d.reactions } : x)) }));
      else if (name === 'typing') showTyping('ch' + id, d);
    } else if (chan.startsWith('u:')) {
      if (name === 'sig') onSignal(d);
      else if (name === 'typing' && d.dm) showTyping('dm' + d.dm, d);
      else if (name === 'dm') {
        if (v.t === 'dm' && v.id === d.from) { const [m] = await decryptList([{ id: d.id, mine: false, enc: d.enc, at: d.at }]); setDmMsgs((x) => (x[d.from]?.some((y) => y.id === d.id) ? x : { ...x, [d.from]: [...(x[d.from] || []), { ...m, fresh: true }] })); setTyping((t) => ({ ...t, ['dm' + d.from]: {} })); api(`/api/chat/dm/${d.from}?after=${d.id - 1}`).catch(() => {}); }
        else { blip(740); setBoot((b) => b && { ...b, friends: b.friends.map((f) => (f.id === d.from ? { ...f, unread: (f.unread || 0) + 1 } : f)) }); }
      }
    }
  }, [onSignal, decryptList]);
  useEffect(() => { if (!boot) return; const stop = connectRealtime({ channel: view.t === 'ch' ? view.id : 0, onEvent, onState: setRt }); return stop; }, [!!boot, view.t, view.id]); // eslint-disable-line
  // εφεδρικό polling (πιο συχνό όταν δεν υπάρχει Ably)
  useEffect(() => {
    if (!boot) return; let alive = true;
    api('/api/chat/signals').then((r) => { if (r.last !== undefined) sigAfter.current = r.last; }).catch(() => {});
    const tick = async () => {
      if (!alive || document.visibilityState !== 'visible') return; const v = viewRef.current;
      try { const r = await api(`/api/chat/signals?after=${sigAfter.current}`); r.signals.forEach(onSignal); } catch {}
      if (!rt) { if (v.t === 'ch' && v.id) loadChannel(v.id, lastId(msgsRef.current[v.id])).catch(() => {}); if (v.t === 'dm' && v.id) loadDm(v.id, lastId(dmMsgsRef.current[v.id])).catch(() => {}); }
    };
    const t = setInterval(tick, rt ? 15000 : 3000); return () => { alive = false; clearInterval(t); };
  }, [!!boot, rt, onSignal, loadChannel, loadDm]); // eslint-disable-line

  /* ---------------- αποστολή ---------------- */
  const lastTyping = useRef(0);
  const onTyping = () => { if (!rt || Date.now() - lastTyping.current < 3000) return; lastTyping.current = Date.now(); api('/api/chat/typing', { method: 'POST', body: view.t === 'ch' ? { ch: view.id } : { dm: view.id } }).catch(() => {}); };
  const sendChannel = async (text, replyTo) => {
    const r = await api(`/api/chat/channels/${channel.id}`, { method: 'POST', body: { body: text, reply_to: replyTo?.id } });
    setMsgs((m) => (m[channel.id]?.some((x) => x.id === r.message.id) ? m : { ...m, [channel.id]: [...(m[channel.id] || []), { ...r.message, fresh: true, mine: true }] }));
  };
  const sendDm = async (text) => {
    const mod = moderate(text, boot.filter || {}); if (mod.error) throw new Error(mod.error);   // το φίλτρο τρέχει ΠΡΙΝ την κρυπτογράφηση
    const encd = await encryptFor(me.id, friend.id, text);
    const r = await api(`/api/chat/dm/${friend.id}`, { method: 'POST', body: { enc: encd } });
    setDmMsgs((d) => ({ ...d, [friend.id]: [...(d[friend.id] || []), { ...r.message, text, e2e: true, fresh: true }] }));
  };
  const act = async (m, action, extra) => {
    try {
      if (action === 'react') await api(`/api/chat/messages/${m.id}`, { method: 'POST', body: { action: 'react', emoji: extra } });
      if (action === 'delete') { if (!confirm('Να σβηστεί το μήνυμα;')) return; await api(`/api/chat/messages/${m.id}`, { method: 'DELETE' }); setMsgs((x) => ({ ...x, [channel.id]: x[channel.id].map((y) => (y.id === m.id ? { ...y, deleted: true } : y)) })); }
      if (action === 'edit') { const r = await api(`/api/chat/messages/${m.id}`, { method: 'PATCH', body: { body: extra } }); setMsgs((x) => ({ ...x, [channel.id]: x[channel.id].map((y) => (y.id === m.id ? { ...y, ...r.message, fresh: false } : y)) })); }
      if (action === 'report') { const reason = prompt('Γιατί αναφέρεις αυτό το μήνυμα; (θα το δουν οι διαχειριστές)'); if (reason === null) return; await api(`/api/chat/messages/${m.id}`, { method: 'POST', body: { action: 'report', reason } }); alert('Ευχαριστούμε! Η αναφορά στάλθηκε.'); }
      if (!rt && channel && action !== 'report') loadChannel(channel.id).catch(() => {});
    } catch (e) { alert(e.message); }
  };
  const reportDm = async () => {
    const reason = prompt('Τι συμβαίνει; (π.χ. «με ενοχλεί», «ζητάει προσωπικά στοιχεία»). Οι διαχειριστές θα δουν τα τελευταία μηνύματα αυτής της συνομιλίας.'); if (reason === null) return;
    const snap = (dmMsgs[friend.id] || []).slice(-50).map((m) => ({ mine: m.mine, body: m.text || '', at: m.at }));
    try { await api('/api/community/report', { method: 'POST', body: { id: friend.id, reason: 'other', detail: reason, snapshot: snap, block: confirm('Θέλεις επίσης να μπλοκάρεις αυτόν τον χρήστη;') } }); alert('Η αναφορά στάλθηκε. Αν νιώθεις ότι κινδυνεύεις, μίλησε ΤΩΡΑ σε έναν γονιό ή καθηγητή.'); loadBoot(); } catch (e) { alert(e.message); }
  };

  /* ---------------- servers ---------------- */
  const join = async (s) => { try { await api('/api/chat/servers', { method: 'POST', body: { id: s.id, action: 'join', accept: true } }); setRules(null); const b = await loadBoot(); const sv = b?.servers.find((x) => x.id === s.id); if (sv?.channels[0]) go({ t: 'ch', id: sv.channels[0].id }); } catch (e) { alert(e.message); } };
  const leave = async (s) => { if (!confirm(`Να φύγεις από τον server «${s.name}»;`)) return; await api('/api/chat/servers', { method: 'POST', body: { id: s.id, action: 'leave' } }).catch(() => {}); go({ t: 'home' }); loadBoot(); };

  if (err && !boot) return <div className="cx-splash"><Mascot mood="confused" size={140} /><h1>Ωχ!</h1><p>{err}</p><a className="cx-btn" href={siteUrl}>← Πίσω στην εφημερίδα</a></div>;
  if (!boot) return <div className="cx-splash"><div className="cx-loader" /><p>Φόρτωση…</p></div>;
  const curServer = channel?.server || null;
  const typers = Object.values(typing[view.t === 'ch' ? 'ch' + view.id : 'dm' + view.id] || {});
  const unreadDm = boot.friends.reduce((n, f) => n + (f.unread || 0), 0);

  return (
    <div className={`cx${drawer ? ' drawer' : ''}`}>
      {/* ράγα servers */}
      <nav className="cx-rail" aria-label="Servers">
        <button type="button" className={`cx-sv home${view.t === 'home' || view.t === 'dm' ? ' on' : ''}`} onClick={() => { go({ t: 'dm' }); setDrawer(true); }} title="Μηνύματα"><Mascot mood={me.avatar} size={40} />{unreadDm > 0 && <span className="cx-pill-n">{unreadDm}</span>}</button>
        <span className="cx-sep" />
        {boot.servers.map((s) => { const un = s.channels.reduce((n, c) => n + (c.unread || 0), 0); return (
          <button key={s.id} type="button" className={`cx-sv${curServer?.id === s.id ? ' on' : ''}${un ? ' unread' : ''}`} style={{ '--sc': s.color }} title={s.name} onClick={() => { const c = s.channels.find((x) => x.unread) || s.channels[0]; if (c) go({ t: 'ch', id: c.id }); setDrawer(true); }}>
            <span className="cx-sv-i">{s.icon}</span>{un > 0 && <span className="cx-pill-n">{un > 99 ? '99+' : un}</span>}</button>); })}
        <button type="button" className={`cx-sv add${view.t === 'explore' ? ' on' : ''}`} onClick={() => go({ t: 'explore' })} title="Εξερεύνηση servers">🧭</button>
        <a className="cx-sv back" href={siteUrl} title="Πίσω στην εφημερίδα">📰</a>
      </nav>
      {/* πλαϊνό: κανάλια ή DM */}
      <aside className="cx-side">
        {curServer ? <>
          <header className="cx-side-h" style={{ '--sc': curServer.color }}><span>{curServer.icon} {curServer.name}</span><button type="button" className="cx-ib" title="Αποχώρηση" onClick={() => leave(curServer)}>⎋</button></header>
          <div className="cx-chans">{curServer.channels.map((c) => <button key={c.id} type="button" className={`cx-ch${c.id === view.id ? ' on' : ''}${c.unread ? ' unread' : ''}`} onClick={() => { go({ t: 'ch', id: c.id }); setDrawer(false); }}><span className="hash">{c.readonly ? '📢' : '#'}</span>{c.name}{c.unread > 0 && <span className="cx-n">{c.unread}</span>}</button>)}</div>
        </> : <>
          <header className="cx-side-h"><span>💬 Μηνύματα</span></header>
          <div className="cx-chans">
            <a className="cx-ch" href={`${siteUrl}/account/friends`}>🤝 Φίλοι & αιτήματα</a>
            <p className="cx-label">ΠΡΟΣΩΠΙΚΑ ΜΗΝΥΜΑΤΑ 🔒</p>
            {!boot.friends.length && <p className="cx-muted">Πρόσθεσε φίλους για να ξεκινήσεις!</p>}
            {boot.friends.map((f) => <button key={f.id} type="button" className={`cx-ch cx-dmi${view.t === 'dm' && view.id === f.id ? ' on' : ''}${f.unread ? ' unread' : ''}`} onClick={() => { go({ t: 'dm', id: f.id }); setDrawer(false); }}>
              <span className="cx-av"><Mascot mood={f.avatar} size={30} /><i className={f.online ? 'on' : ''} /></span>{f.nickname}{f.unread > 0 && <span className="cx-n">{f.unread}</span>}</button>)}
          </div>
        </>}
        <footer className="cx-me"><span className="cx-av"><Mascot mood={me.avatar} size={34} /><i className="on" /></span><span className="cx-me-n"><b>{me.nickname}</b><small>{rt ? '⚡ Ζωντανά' : '🔄 Συγχρονισμός'}</small></span><button type="button" className="cx-ib" title="Ρυθμίσεις" onClick={() => setSettings(true)}>⚙️</button></footer>
      </aside>
      {/* κύριο μέρος */}
      <main className="cx-main">
        {view.t === 'explore' ? <Explore onJoin={(s) => (s.rules ? setRules(s) : join(s))} onOpen={(s) => { const sv = boot.servers.find((x) => x.id === s.id); if (sv?.channels[0]) go({ t: 'ch', id: sv.channels[0].id }); }} onMenu={() => setDrawer(true)} />
          : channel ? <>
            <header className="cx-top"><button type="button" className="cx-ib cx-burger" onClick={() => setDrawer(true)} aria-label="Μενού">☰</button><span className="hash">{channel.readonly ? '📢' : '#'}</span><b>{channel.name}</b>{channel.topic && <span className="cx-topic">{channel.topic}</span>}<span className="grow" />
              {channel.slowmode > 0 && <span className="cx-chip" title="Αργή λειτουργία">🐢 {channel.slowmode}″</span>}<button type="button" className={`cx-ib${showMembers ? ' on' : ''}`} onClick={() => setShowMembers(!showMembers)} title="Μέλη">👥</button></header>
            <div className="cx-body"><div className="cx-col">
              <MessageList key={'c' + channel.id} items={msgs[channel.id] || []} me={me} onAct={act} onOlder={olderChannel} intro={<div className="cx-intro"><span className="cx-intro-i" style={{ background: curServer.color }}>#</span><h2>Καλώς ήρθες στο #{channel.name}!</h2><p>{channel.topic || `Η αρχή του καναλιού #${channel.name}.`}</p></div>} />
              <Typers names={typers} />
              {channel.readonly ? <div className="cx-ro">📢 Σε αυτό το κανάλι γράφουν μόνο οι διαχειριστές.</div> : <Composer key={'cc' + channel.id} placeholder={`Μήνυμα στο #${channel.name}`} onSend={sendChannel} onTyping={onTyping} reply />}
            </div>{showMembers && <Members list={members} />}</div>
          </> : friend ? <>
            <header className="cx-top"><button type="button" className="cx-ib cx-burger" onClick={() => setDrawer(true)} aria-label="Μενού">☰</button><span className="cx-av sm"><Mascot mood={friend.avatar} size={26} /><i className={friend.online ? 'on' : ''} /></span><b>{friend.nickname}</b><span className="cx-e2e" title="Κρυπτογράφηση άκρο-σε-άκρο: μόνο εσείς οι δύο μπορείτε να διαβάσετε τα μηνύματα.">🔒 Κρυπτογραφημένο</span><span className="grow" />
              {boot.features.calls && <><button type="button" className="cx-ib" title="Φωνητική κλήση" onClick={() => callRef.current?.start(friend, false)}>📞</button>{boot.features.video && <button type="button" className="cx-ib" title="Βιντεοκλήση" onClick={() => callRef.current?.start(friend, true)}>🎥</button>}</>}
              <button type="button" className="cx-ib" title="Αναφορά" onClick={reportDm}>🚩</button></header>
            <div className="cx-body"><div className="cx-col">
              {e2eErr && <div className="cx-warn">{e2eErr}</div>}
              <MessageList key={'d' + friend.id} items={dmMsgs[friend.id] || []} me={me} friend={friend} dm seenUpTo={dmSeen[friend.id]} intro={<div className="cx-intro"><Mascot mood={friend.avatar} size={80} /><h2>{friend.nickname}</h2><p>Η αρχή της συνομιλίας σας. 🔒 Τα μηνύματα είναι κρυπτογραφημένα: μόνο εσείς οι δύο μπορείτε να τα διαβάσετε. Σβήνονται αυτόματα μετά από λίγες εβδομάδες.</p></div>} />
              <Typers names={typers} />
              {boot.features.messages ? <Composer key={'dc' + friend.id} placeholder={`Μήνυμα προς ${friend.nickname} 🔒`} onSend={sendDm} onTyping={onTyping} disabled={!!e2eErr} /> : <div className="cx-ro">Τα μηνύματα είναι προσωρινά κλειστά.</div>}
              <p className="cx-safe">🛡️ Μη δίνεις ποτέ διεύθυνση, τηλέφωνο, κωδικούς ή φωτογραφίες σου, και μη δέχεσαι να βρεθείς με κάποιον που γνώρισες online.</p>
            </div></div>
          </> : <Home boot={boot} onMenu={() => setDrawer(true)} />}
      </main>
      <div className="cx-scrim" onClick={() => setDrawer(false)} />
      {rules && <RulesModal server={rules} onClose={() => setRules(null)} onAccept={() => join(rules)} />}
      {settings && <Settings me={me} onClose={() => setSettings(false)} onChange={(allowCalls) => setBoot((b) => ({ ...b, me: { ...b.me, allowCalls } }))} siteUrl={siteUrl} />}
      <CallLayer ref={callRef} me={me} features={boot.features} />
    </div>
  );
}

function Typers({ names }) {
  if (!names.length) return <div className="cx-typing" aria-hidden="true" />;
  const t = names.length === 1 ? `Ο/Η ${names[0]} γράφει…` : names.length === 2 ? `${names[0]} και ${names[1]} γράφουν…` : 'Πολλοί γράφουν…';
  return <div className="cx-typing" aria-live="polite"><span className="cx-dots"><i /><i /><i /></span><b>{t}</b></div>;
}
function Members({ list }) {
  const on = list.filter((m) => m.online), off = list.filter((m) => !m.online);
  const L = ({ title, items, dim }) => items.length > 0 && <><p className="cx-label">{title} — {items.length}</p>{items.map((m) => <div key={m.id} className={`cx-mem${dim ? ' dim' : ''}`}><span className="cx-av"><Mascot mood={m.avatar} size={30} /><i className={m.online ? 'on' : ''} /></span>{m.nickname}</div>)}</>;
  return <aside className="cx-members"><L title="ONLINE" items={on} /><L title="OFFLINE" items={off} dim /></aside>;
}
function Home({ boot, onMenu }) {
  return (
    <div className="cx-home">
      <header className="cx-top"><button type="button" className="cx-ib cx-burger" onClick={onMenu} aria-label="Μενού">☰</button><b>Καλώς ήρθες, {boot.me.nickname}! 👋</b></header>
      <div className="cx-home-b"><Mascot mood="celebrate" size={150} /><h1>Το chat του «Όσα δεν γράφει ο πίνακας»</h1>
        <p>Μπες σε έναν server από την <a href="#explore">🧭 Εξερεύνηση</a>, ή διάλεξε έναν φίλο από αριστερά για να του γράψεις. Τα προσωπικά μηνύματα είναι <b>κρυπτογραφημένα</b> 🔒 και μπορείτε να κάνετε και <b>κλήσεις</b> 📞.</p>
        <div className="cx-home-g">{boot.servers.length ? boot.servers.map((s) => <a key={s.id} href={s.channels[0] ? `#ch/${s.channels[0].id}` : '#explore'} className="cx-hcard" style={{ '--sc': s.color }}><span>{s.icon}</span><b>{s.name}</b><small>{s.description}</small></a>)
          : <a href="#explore" className="cx-hcard"><span>🧭</span><b>Βρες servers</b><small>Δες ποιοι servers υπάρχουν και μπες!</small></a>}</div></div>
    </div>
  );
}
function Settings({ me, onClose, onChange, siteUrl }) {
  const [allow, setAllow] = useState(me.allowCalls);
  const save = async (v) => { setAllow(v); try { await api('/api/chat/me', { method: 'PATCH', body: { allowCalls: v } }); onChange(v); } catch (e) { alert(e.message); } };
  return (
    <div className="cx-modal-back" onClick={onClose}><div className="cx-modal" role="dialog" aria-modal="true" aria-label="Ρυθμίσεις" onClick={(e) => e.stopPropagation()}>
      <h2>⚙️ Ρυθμίσεις</h2>
      <label className="cx-toggle"><input type="checkbox" checked={allow} onChange={(e) => save(e.target.checked)} /><span /> Δέχομαι κλήσεις από φίλους</label>
      <p className="cx-muted">🔒 Τα κλειδιά κρυπτογράφησης αυτής της συσκευής φτιάχτηκαν αυτόματα και δεν φεύγουν ποτέ από αυτήν. Σε νέα συσκευή θα βλέπεις τα μηνύματα από εκεί και πέρα.</p>
      <div className="cx-btns"><a className="cx-btn ghost" href={`${siteUrl}/account`}>Ο λογαριασμός μου</a><button type="button" className="cx-btn" onClick={onClose}>Κλείσιμο</button></div>
    </div></div>
  );
}
