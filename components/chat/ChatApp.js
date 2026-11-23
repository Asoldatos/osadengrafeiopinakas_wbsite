'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Mascot from '../Mascot';
import Icon from '../Icons';
import { api } from '@/lib/clientUpload';
import { connectRealtime, blip } from '@/lib/chatClient';
import { e2eSupported, myDevice, encryptFor, decryptMsg } from '@/lib/e2e';
import { moderate } from '@/lib/community.mjs';
import { MessageList, Composer } from './Messages';
import CallLayer from './CallLayer';
import { Explore, RulesModal } from './Explore';

const parseHash = () => { const h = (typeof location !== 'undefined' ? location.hash : '').replace(/^#\/?/, ''); const [k, id] = h.split('/'); return k === 'ch' ? { t: 'ch', id: +id } : k === 'dm' ? { t: 'dm', id: +id || 0 } : k === 'explore' ? { t: 'explore' } : { t: 'home' }; };
const go = (v) => { location.hash = v.t === 'ch' ? `#ch/${v.id}` : v.t === 'dm' ? (v.id ? `#dm/${v.id}` : '#dm') : v.t === 'explore' ? '#explore' : ''; };
/** Όνομα καναλιού χωρίς emoji στην αρχή (π.χ. «💬-γενικά» → «γενικά»). */
export const chName = (n) => String(n || '').replace(/^[\p{Extended_Pictographic}️‍\s]+-?/u, '') || n;
const initials = (n) => String(n || '?').replace(/[«»"]/g, '').split(/\s+/).filter((w) => w.length > 2 || /^\p{Lu}/u.test(w)).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || String(n || '?')[0];
export const SpaceMark = ({ s, size = 34 }) => <span className="pc-mark" style={{ '--sc': s.color || '#2C5E4A', width: size, height: size, fontSize: size * 0.4 }}>{initials(s.name)}</span>;

/** Η εφαρμογή chat: χώροι & κανάλια, προσωπικά μηνύματα (κρυπτογραφημένα), κλήσεις. */
export default function ChatApp({ siteUrl }) {
  const [boot, setBoot] = useState(null), [err, setErr] = useState(''), [view, setView] = useState({ t: 'home' }), [rt, setRt] = useState(false);
  const [msgs, setMsgs] = useState({}), [typing, setTyping] = useState({}), [members, setMembers] = useState([]), [showMembers, setShowMembers] = useState(true);
  const [dmMsgs, setDmMsgs] = useState({}), [dmSeen, setDmSeen] = useState({}), [rules, setRules] = useState(null), [e2eErr, setE2eErr] = useState(''), [settings, setSettings] = useState(false);
  const [q, setQ] = useState(''), [open, setOpen] = useState({});
  const callRef = useRef(null), sigAfter = useRef(0), seenSig = useRef(new Set()), bootRef = useRef(null), viewRef = useRef(view);
  bootRef.current = boot; viewRef.current = view;

  const loadBoot = useCallback(() => api('/api/chat/bootstrap').then((b) => { setBoot(b); return b; }).catch((e) => setErr(e.message)), []);
  useEffect(() => { loadBoot(); const on = () => setView(parseHash()); on(); window.addEventListener('hashchange', on); return () => window.removeEventListener('hashchange', on); }, [loadBoot]);
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') { setRules(null); setSettings(false); } }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  useEffect(() => { if (!boot?.me) return; if (!e2eSupported()) { setE2eErr('Αυτός ο browser δεν υποστηρίζει κρυπτογράφηση. Δοκίμασε Chrome, Edge, Firefox ή Safari.'); return; } myDevice(boot.me.id).catch(() => setE2eErr('Δεν ήταν δυνατή η δημιουργία κλειδιών κρυπτογράφησης σε αυτή τη συσκευή.')); }, [boot?.me?.id]); // eslint-disable-line
  useEffect(() => { const t = setInterval(() => { if (document.visibilityState === 'visible') { api('/api/chat/ping', { method: 'POST', body: {} }).catch(() => {}); loadBoot(); } }, 45000); return () => clearInterval(t); }, [loadBoot]);

  const me = boot?.me;
  const channel = useMemo(() => (view.t === 'ch' ? boot?.servers.flatMap((s) => s.channels.map((c) => ({ ...c, server: s }))).find((c) => c.id === view.id) : null), [boot, view]);
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

  /* ---------------- προσωπικά μηνύματα (E2E) ---------------- */
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
  const dmMsgsRef = useRef(dmMsgs); dmMsgsRef.current = dmMsgs; const msgsRef = useRef(msgs); msgsRef.current = msgs;
  const bumpFriend = (fid) => { blip(740, 0.1, 0.05); setBoot((b) => b && { ...b, friends: b.friends.map((f) => (f.id === fid ? { ...f, unread: (f.unread || 0) + 1 } : f)) }); };
  const onSignal = useCallback((s) => {
    if (seenSig.current.has(s.id)) return; seenSig.current.add(s.id); sigAfter.current = Math.max(sigAfter.current, s.id);
    if (s.kind.startsWith('call:')) callRef.current?.signal(s);
    else if (s.kind === 'dm') { const v = viewRef.current; if (v.t === 'dm' && v.id === s.from) loadDm(s.from, lastId(dmMsgsRef.current[s.from])); else bumpFriend(s.from); }
  }, [loadDm]); // eslint-disable-line
  const onEvent = useCallback(async (chan, name, d) => {
    const v = viewRef.current;
    if (chan.startsWith('ch:')) {
      const id = +chan.slice(3);
      if (name === 'msg') { if (d.uid !== bootRef.current?.me.id) blip(1040, 0.06, 0.03); setMsgs((m) => (m[id]?.some((x) => x.id === d.id) ? m : { ...m, [id]: [...(m[id] || []), { ...d, fresh: true }] })); setTyping((t) => { const x = { ...(t['ch' + id] || {}) }; delete x[d.uid]; return { ...t, ['ch' + id]: x }; }); }
      else if (name === 'edit') setMsgs((m) => ({ ...m, [id]: (m[id] || []).map((x) => (x.id === d.id ? { ...x, ...d, fresh: false } : x)) }));
      else if (name === 'del') setMsgs((m) => ({ ...m, [id]: (m[id] || []).map((x) => (x.id === d.id ? { ...x, deleted: true, body: '' } : x)) }));
      else if (name === 'react') setMsgs((m) => ({ ...m, [id]: (m[id] || []).map((x) => (x.id === d.id ? { ...x, reactions: d.reactions } : x)) }));
      else if (name === 'typing') showTyping('ch' + id, d);
    } else if (chan.startsWith('u:')) {
      if (name === 'sig') onSignal(d);
      else if (name === 'typing' && d.dm) showTyping('dm' + d.dm, d);
      else if (name === 'dm') {
        if (v.t === 'dm' && v.id === d.from) { const [m] = await decryptList([{ id: d.id, mine: false, enc: d.enc, at: d.at }]); setDmMsgs((x) => (x[d.from]?.some((y) => y.id === d.id) ? x : { ...x, [d.from]: [...(x[d.from] || []), { ...m, fresh: true }] })); setTyping((t) => ({ ...t, ['dm' + d.from]: {} })); api(`/api/chat/dm/${d.from}?after=${d.id - 1}`).catch(() => {}); }
        else bumpFriend(d.from);
      }
    }
  }, [onSignal, decryptList]); // eslint-disable-line
  useEffect(() => { if (!boot) return; return connectRealtime({ channel: view.t === 'ch' ? view.id : 0, onEvent, onState: setRt }); }, [!!boot, view.t, view.id]); // eslint-disable-line
  // εφεδρικό polling: κάθε 2,5″ χωρίς Ably, κάθε 20″ με Ably (για ό,τι τυχόν χάθηκε)
  useEffect(() => {
    if (!boot) return; let alive = true;
    api('/api/chat/signals').then((r) => { if (r.last !== undefined) sigAfter.current = Math.max(sigAfter.current, r.last); }).catch(() => {});
    const tick = async () => {
      if (!alive || document.visibilityState !== 'visible') return; const v = viewRef.current;
      try { const r = await api(`/api/chat/signals?after=${sigAfter.current}`); r.signals.forEach(onSignal); } catch {}
      if (v.t === 'ch' && v.id) loadChannel(v.id, lastId(msgsRef.current[v.id])).catch(() => {});
      if (v.t === 'dm' && v.id) loadDm(v.id, lastId(dmMsgsRef.current[v.id])).catch(() => {});
    };
    const t = setInterval(tick, rt ? 20000 : 2500); return () => { alive = false; clearInterval(t); };
  }, [!!boot, rt, onSignal, loadChannel, loadDm]); // eslint-disable-line

  /* ---------------- αποστολή ---------------- */
  const lastTyping = useRef(0);
  const onTyping = () => { if (!rt || Date.now() - lastTyping.current < 2500) return; lastTyping.current = Date.now(); api('/api/chat/typing', { method: 'POST', body: viewRef.current.t === 'ch' ? { ch: viewRef.current.id } : { dm: viewRef.current.id } }).catch(() => {}); };
  const sendChannel = async (text, replyTo) => {
    const tmp = -Date.now();   // αισιόδοξη εμφάνιση: το μήνυμα φαίνεται αμέσως, πριν απαντήσει ο διακομιστής
    setMsgs((m) => ({ ...m, [channel.id]: [...(m[channel.id] || []), { id: tmp, uid: me.id, nick: me.nickname, avatar: me.avatar, body: text, at: new Date().toISOString(), reactions: [], pending: true, fresh: true, reply: replyTo ? { id: replyTo.id, nick: replyTo.nick, body: replyTo.body } : null }] }));
    try {
      const r = await api(`/api/chat/channels/${channel.id}`, { method: 'POST', body: { body: text, reply_to: replyTo?.id } });
      setMsgs((m) => { const list = (m[channel.id] || []).filter((x) => x.id !== tmp); return { ...m, [channel.id]: list.some((x) => x.id === r.message.id) ? list : [...list, { ...r.message }] }; });
    } catch (e) { setMsgs((m) => ({ ...m, [channel.id]: (m[channel.id] || []).filter((x) => x.id !== tmp) })); throw e; }
  };
  const sendDm = async (text) => {
    const mod = moderate(text, boot.filter || {}); if (mod.error) throw new Error(mod.error);   // το φίλτρο τρέχει ΠΡΙΝ την κρυπτογράφηση
    const tmp = -Date.now();
    setDmMsgs((d) => ({ ...d, [friend.id]: [...(d[friend.id] || []), { id: tmp, mine: true, text, e2e: true, at: new Date().toISOString(), pending: true, fresh: true }] }));
    try {
      const encd = await encryptFor(me.id, friend.id, text);
      const r = await api(`/api/chat/dm/${friend.id}`, { method: 'POST', body: { enc: encd } });
      setDmMsgs((d) => ({ ...d, [friend.id]: (d[friend.id] || []).map((x) => (x.id === tmp ? { ...r.message, text, e2e: true } : x)) }));
    } catch (e) { setDmMsgs((d) => ({ ...d, [friend.id]: (d[friend.id] || []).filter((x) => x.id !== tmp) })); throw e; }
  };
  const act = async (m, action, extra) => {
    try {
      if (action === 'react') await api(`/api/chat/messages/${m.id}`, { method: 'POST', body: { action: 'react', emoji: extra } });
      if (action === 'delete') { if (!confirm('Να διαγραφεί το μήνυμα;')) return; await api(`/api/chat/messages/${m.id}`, { method: 'DELETE' }); setMsgs((x) => ({ ...x, [channel.id]: x[channel.id].map((y) => (y.id === m.id ? { ...y, deleted: true } : y)) })); }
      if (action === 'edit') { const r = await api(`/api/chat/messages/${m.id}`, { method: 'PATCH', body: { body: extra } }); setMsgs((x) => ({ ...x, [channel.id]: x[channel.id].map((y) => (y.id === m.id ? { ...y, ...r.message, fresh: false } : y)) })); }
      if (action === 'report') { const reason = prompt('Γιατί αναφέρεις αυτό το μήνυμα; Θα το δουν οι διαχειριστές.'); if (reason === null) return; await api(`/api/chat/messages/${m.id}`, { method: 'POST', body: { action: 'report', reason } }); alert('Ευχαριστούμε. Η αναφορά στάλθηκε.'); }
      if (!rt && channel && action !== 'report') loadChannel(channel.id).catch(() => {});
    } catch (e) { alert(e.message); }
  };
  const reportDm = async () => {
    const reason = prompt('Τι συμβαίνει; Οι διαχειριστές θα δουν τα τελευταία μηνύματα αυτής της συνομιλίας.'); if (reason === null) return;
    const snap = (dmMsgs[friend.id] || []).filter((m) => m.id > 0).slice(-50).map((m) => ({ mine: m.mine, body: m.text || '', at: m.at }));
    try { await api('/api/community/report', { method: 'POST', body: { id: friend.id, reason: 'other', detail: reason, snapshot: snap, block: confirm('Θέλεις επίσης να μπλοκάρεις αυτόν τον χρήστη;') } }); alert('Η αναφορά στάλθηκε. Αν νιώθεις ότι κινδυνεύεις, μίλησε τώρα σε έναν γονιό ή καθηγητή.'); loadBoot(); } catch (e) { alert(e.message); }
  };
  const join = async (s) => { try { await api('/api/chat/servers', { method: 'POST', body: { id: s.id, action: 'join', accept: true } }); setRules(null); const b = await loadBoot(); const sv = b?.servers.find((x) => x.id === s.id); if (sv?.channels[0]) go({ t: 'ch', id: sv.channels[0].id }); } catch (e) { alert(e.message); } };
  const leave = async (s) => { if (!confirm(`Να φύγεις από τον χώρο «${s.name}»;`)) return; await api('/api/chat/servers', { method: 'POST', body: { id: s.id, action: 'leave' } }).catch(() => {}); go({ t: 'home' }); loadBoot(); };

  if (err && !boot) return <div className="pc-splash"><Mascot mood="confused" size={130} /><h1>Κάτι πήγε στραβά</h1><p>{err}</p><a className="pc-btn" href={siteUrl || '/'}>Πίσω στην εφημερίδα</a></div>;
  if (!boot) return <div className="pc-splash"><div className="pc-loader" /><p>Φόρτωση…</p></div>;
  const key = view.t === 'ch' ? 'ch' + view.id : 'dm' + view.id;
  const typers = Object.values(typing[key] || {});
  const ql = q.trim().toLowerCase();
  const inConv = view.t === 'ch' || (view.t === 'dm' && view.id) || view.t === 'explore';

  return (
    <div className={`pc${inConv ? ' in-conv' : ''}`}>
      {/* πλαϊνή στήλη */}
      <aside className="pc-side">
        <header className="pc-brand"><a href={siteUrl || '/'} className="pc-wordmark" title="Πίσω στην εφημερίδα"><b>Πίνακας</b><span>chat</span></a>
          <button type="button" className="pc-ib" title="Ρυθμίσεις" onClick={() => setSettings(true)}><Icon name="sliders" /></button></header>
        <label className="pc-search"><Icon name="search" size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Αναζήτηση" aria-label="Αναζήτηση καναλιών και φίλων" /></label>
        <nav className="pc-nav" aria-label="Συνομιλίες">
          <div className="pc-sec"><span>Χώροι</span><button type="button" className="pc-link" onClick={() => go({ t: 'explore' })}><Icon name="compass" size={15} /> Εξερεύνηση</button></div>
          {!boot.servers.length && <button type="button" className="pc-empty" onClick={() => go({ t: 'explore' })}>Δεν είσαι ακόμα σε κανέναν χώρο. Βρες έναν από την Εξερεύνηση.</button>}
          {boot.servers.map((s) => {
            const chans = s.channels.filter((c) => !ql || chName(c.name).toLowerCase().includes(ql) || s.name.toLowerCase().includes(ql)); if (ql && !chans.length) return null;
            const closed = open[s.id] === false && !ql, un = s.channels.reduce((n, c) => n + (c.unread || 0), 0);
            return (
              <div key={s.id} className="pc-space">
                <button type="button" className="pc-space-h" onClick={() => setOpen((o) => ({ ...o, [s.id]: o[s.id] === false }))} aria-expanded={!closed}>
                  <SpaceMark s={s} size={26} /><b>{s.name}</b>{closed && un > 0 && <span className="pc-count">{un}</span>}<span className={`pc-chev${closed ? '' : ' open'}`} /></button>
                {!closed && chans.map((c) => (
                  <button key={c.id} type="button" className={`pc-item${view.t === 'ch' && view.id === c.id ? ' on' : ''}${c.unread ? ' unread' : ''}`} onClick={() => go({ t: 'ch', id: c.id })}>
                    <Icon name={c.readonly ? 'megaphone' : 'hash'} size={16} /><span className="pc-item-n">{chName(c.name)}</span>{c.unread > 0 && <span className="pc-count">{c.unread > 99 ? '99+' : c.unread}</span>}</button>))}
              </div>);
          })}
          <div className="pc-sec"><span>Μηνύματα</span><a className="pc-link" href={`${siteUrl}/account/friends`}><Icon name="userPlus" size={15} /> Φίλοι</a></div>
          {!boot.friends.length && <a className="pc-empty" href={`${siteUrl}/account/friends`}>Πρόσθεσε φίλους από τον λογαριασμό σου για να ξεκινήσεις μια συζήτηση.</a>}
          {boot.friends.filter((f) => !ql || f.nickname.toLowerCase().includes(ql)).map((f) => (
            <button key={f.id} type="button" className={`pc-item person${view.t === 'dm' && view.id === f.id ? ' on' : ''}${f.unread ? ' unread' : ''}`} onClick={() => go({ t: 'dm', id: f.id })}>
              <span className="pc-av"><Mascot mood={f.avatar} size={28} /><i className={f.online ? 'on' : ''} /></span><span className="pc-item-n">{f.nickname}</span>{f.unread > 0 && <span className="pc-count">{f.unread}</span>}</button>))}
        </nav>
        <footer className="pc-me">
          <span className="pc-av"><Mascot mood={me.avatar} size={32} /><i className="on" /></span>
          <span className="pc-me-n"><b>{me.nickname}</b><small className={rt ? 'live' : ''}>{rt ? 'Σε σύνδεση' : 'Συγχρονισμός'}</small></span>
        </footer>
      </aside>

      {/* κύριο μέρος */}
      <main className="pc-main">
        {view.t === 'explore' ? <Explore onJoin={(s) => (s.rules ? setRules(s) : join(s))} onOpen={(s) => { const sv = boot.servers.find((x) => x.id === s.id); if (sv?.channels[0]) go({ t: 'ch', id: sv.channels[0].id }); }} onBack={() => go({ t: 'home' })} />
          : channel ? <>
            <header className="pc-top">
              <button type="button" className="pc-ib pc-back" onClick={() => go({ t: 'home' })} aria-label="Πίσω"><Icon name="back" /></button>
              <div className="pc-title"><span className="pc-crumb">{channel.server.name}</span><h1><Icon name={channel.readonly ? 'megaphone' : 'hash'} size={18} />{chName(channel.name)}</h1></div>
              {channel.topic && <p className="pc-topic">{channel.topic}</p>}
              <span className="grow" />
              {channel.slowmode > 0 && <span className="pc-chip" title="Αργή λειτουργία"><Icon name="clock" size={14} /> {channel.slowmode}″</span>}
              <button type="button" className={`pc-ib${showMembers ? ' on' : ''}`} onClick={() => setShowMembers(!showMembers)} title="Μέλη"><Icon name="users" /></button>
              <button type="button" className="pc-ib" onClick={() => leave(channel.server)} title="Αποχώρηση από τον χώρο"><Icon name="leave" /></button>
            </header>
            <div className="pc-body"><div className="pc-col">
              <MessageList key={'c' + channel.id} items={msgs[channel.id] || []} me={me} onAct={act} onOlder={olderChannel}
                intro={<div className="pc-intro"><SpaceMark s={channel.server} size={52} /><h2>{chName(channel.name)}</h2><p>{channel.topic || `Η αρχή του καναλιού ${chName(channel.name)} στον χώρο ${channel.server.name}.`}</p></div>} />
              <Typers names={typers} />
              {channel.readonly ? <div className="pc-note">Σε αυτό το κανάλι γράφει μόνο η σύνταξη.</div> : <Composer key={'cc' + channel.id} placeholder={`Γράψε στο ${chName(channel.name)}`} onSend={sendChannel} onTyping={onTyping} reply />}
            </div>{showMembers && <Members list={members} />}</div>
          </> : friend ? <>
            <header className="pc-top">
              <button type="button" className="pc-ib pc-back" onClick={() => go({ t: 'home' })} aria-label="Πίσω"><Icon name="back" /></button>
              <span className="pc-av"><Mascot mood={friend.avatar} size={34} /><i className={friend.online ? 'on' : ''} /></span>
              <div className="pc-title"><h1>{friend.nickname}</h1><span className="pc-sub">{friend.online ? 'Online' : 'Εκτός σύνδεσης'} · <span className="pc-e2e"><Icon name="lock" size={12} /> κρυπτογραφημένο</span></span></div>
              <span className="grow" />
              {boot.features.calls && <button type="button" className="pc-ib" title="Φωνητική κλήση" onClick={() => callRef.current?.start(friend, false)}><Icon name="phone" /></button>}
              {boot.features.calls && boot.features.video && <button type="button" className="pc-ib" title="Βιντεοκλήση" onClick={() => callRef.current?.start(friend, true)}><Icon name="video" /></button>}
              <button type="button" className="pc-ib" title="Αναφορά" onClick={reportDm}><Icon name="flag" /></button>
            </header>
            <div className="pc-body"><div className="pc-col">
              {e2eErr && <div className="pc-warn">{e2eErr}</div>}
              <MessageList key={'d' + friend.id} items={dmMsgs[friend.id] || []} me={me} friend={friend} dm seenUpTo={dmSeen[friend.id]}
                intro={<div className="pc-intro"><Mascot mood={friend.avatar} size={72} /><h2>{friend.nickname}</h2><p>Τα μηνύματά σας είναι κρυπτογραφημένα από άκρο σε άκρο: μόνο εσείς οι δύο μπορείτε να τα διαβάσετε. Σβήνονται αυτόματα μετά από λίγες εβδομάδες.</p></div>} />
              <Typers names={typers} />
              {boot.features.messages ? <Composer key={'dc' + friend.id} placeholder={`Μήνυμα προς ${friend.nickname}`} onSend={sendDm} onTyping={onTyping} disabled={!!e2eErr} /> : <div className="pc-note">Τα μηνύματα είναι προσωρινά κλειστά.</div>}
              <p className="pc-safe">Μη δίνεις ποτέ διεύθυνση, τηλέφωνο, κωδικούς ή φωτογραφίες σου, και μη δέχεσαι να βρεθείς με κάποιον που γνώρισες online.</p>
            </div></div>
          </> : <Home boot={boot} />}
      </main>
      {rules && <RulesModal server={rules} onClose={() => setRules(null)} onAccept={() => join(rules)} />}
      {settings && <Settings me={me} rt={rt} onClose={() => setSettings(false)} onChange={(allowCalls) => setBoot((b) => ({ ...b, me: { ...b.me, allowCalls } }))} siteUrl={siteUrl} />}
      <CallLayer ref={callRef} me={me} features={boot.features} />
    </div>
  );
}

function Typers({ names }) {
  if (!names.length) return <div className="pc-typing" aria-hidden="true" />;
  const t = names.length === 1 ? `${names[0]} γράφει` : names.length === 2 ? `${names[0]} και ${names[1]} γράφουν` : 'Πολλοί γράφουν';
  return <div className="pc-typing" aria-live="polite"><span className="pc-dots"><i /><i /><i /></span>{t}</div>;
}
function Members({ list }) {
  const on = list.filter((m) => m.online), off = list.filter((m) => !m.online);
  const L = ({ title, items, dim }) => items.length > 0 && <><p className="pc-sec small"><span>{title} · {items.length}</span></p>{items.map((m) => <div key={m.id} className={`pc-mem${dim ? ' dim' : ''}`}><span className="pc-av"><Mascot mood={m.avatar} size={28} /><i className={m.online ? 'on' : ''} /></span>{m.nickname}</div>)}</>;
  return <aside className="pc-members" aria-label="Μέλη"><L title="Online" items={on} /><L title="Εκτός σύνδεσης" items={off} dim /></aside>;
}
function Home({ boot }) {
  const first = boot.servers.find((s) => s.channels.length);
  return (
    <div className="pc-home">
      <div className="pc-home-b">
        <Mascot mood="phone" size={120} />
        <h1>Γεια σου, {boot.me.nickname}</h1>
        <p>Διάλεξε ένα κανάλι ή έναν φίλο από τη λίστα. Τα προσωπικά μηνύματα είναι κρυπτογραφημένα και μπορείς να καλέσεις τους φίλους σου με φωνή ή βίντεο.</p>
        <div className="pc-home-a">
          {first && <button type="button" className="pc-btn" onClick={() => go({ t: 'ch', id: first.channels[0].id })}>Άνοιξε το {chName(first.channels[0].name)}</button>}
          <button type="button" className="pc-btn ghost" onClick={() => go({ t: 'explore' })}><Icon name="compass" size={16} /> Εξερεύνηση χώρων</button>
        </div>
      </div>
    </div>
  );
}
function Settings({ me, rt, onClose, onChange, siteUrl }) {
  const [allow, setAllow] = useState(me.allowCalls);
  const save = async (v) => { setAllow(v); try { await api('/api/chat/me', { method: 'PATCH', body: { allowCalls: v } }); onChange(v); } catch (e) { alert(e.message); } };
  return (
    <div className="pc-modal-back" onClick={onClose}><div className="pc-modal" role="dialog" aria-modal="true" aria-labelledby="pc-set-t" onClick={(e) => e.stopPropagation()}>
      <div className="pc-modal-h"><h2 id="pc-set-t">Ρυθμίσεις</h2><button type="button" className="pc-ib" onClick={onClose} aria-label="Κλείσιμο"><Icon name="x" /></button></div>
      <label className="pc-switch"><input type="checkbox" checked={allow} onChange={(e) => save(e.target.checked)} /><span /> Δέχομαι κλήσεις από φίλους</label>
      <dl className="pc-facts">
        <div><dt>Σύνδεση</dt><dd>{rt ? 'Άμεση (πραγματικός χρόνος)' : 'Συγχρονισμός κάθε λίγα δευτερόλεπτα'}</dd></div>
        <div><dt>Κρυπτογράφηση</dt><dd>Τα κλειδιά αυτής της συσκευής φτιάχτηκαν αυτόματα και δεν φεύγουν ποτέ από αυτήν. Σε νέα συσκευή βλέπεις τα μηνύματα από εκεί και πέρα.</dd></div>
      </dl>
      <div className="pc-btns"><a className="pc-btn ghost" href={`${siteUrl}/account`}>Ο λογαριασμός μου</a><button type="button" className="pc-btn" onClick={onClose}>Τέλος</button></div>
    </div></div>
  );
}
