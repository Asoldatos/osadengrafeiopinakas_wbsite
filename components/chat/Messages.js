'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Mascot from '../Mascot';
import Icon from '../Icons';
import { parseFmt } from '@/lib/chatClient';

// Οι αντιδράσεις και ο επιλογέας emoji είναι περιεχόμενο των χρηστών· η διεπαφή χρησιμοποιεί μόνο εικονίδια SVG.
const REACT = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👏', '🤔', '✅'];
const EMOJI = ['😀', '😂', '🥹', '😍', '😎', '🤩', '🥳', '😅', '😮', '😢', '😡', '🤔', '👍', '👏', '🙌', '💪', '🔥', '✨', '🎉', '❤️', '💙', '💚', '📚', '✏️', '🎮', '⚽', '🎵', '🍕'];
const time = (d) => new Date(d).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
const day = (d) => { const x = new Date(d), t = new Date(); const y = new Date(); y.setDate(t.getDate() - 1);
  return x.toDateString() === t.toDateString() ? 'Σήμερα' : x.toDateString() === y.toDateString() ? 'Χθες' : x.toLocaleDateString('el-GR', { weekday: 'long', day: 'numeric', month: 'long' }); };

function Fmt({ text, me }) {
  return parseFmt(text).map((p, i) => p.t === 'b' ? <b key={i}>{p.v}</b> : p.t === 'i' ? <i key={i}>{p.v}</i> : p.t === 's' ? <s key={i}>{p.v}</s> : p.t === 'code' ? <code key={i}>{p.v}</code>
    : p.t === 'spoiler' ? <Spoiler key={i} v={p.v} /> : p.t === 'mention' ? <span key={i} className={`pc-mention${p.v.slice(1).toLowerCase() === me.nickname.toLowerCase() ? ' me' : ''}`}>{p.v}</span> : <span key={i}>{p.v}</span>);
}
function Spoiler({ v }) { const [o, setO] = useState(false); return <span className={`pc-spoiler${o ? ' open' : ''}`} onClick={() => setO(true)} role="button" tabIndex={0} title="Spoiler: πάτα για να το δεις" onKeyDown={(e) => e.key === 'Enter' && setO(true)}>{v}</span>; }
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Ροή μηνυμάτων: ομάδες ανά συντάκτη, δικά μου δεξιά, διαχωριστικά ημέρας, αντιδράσεις, απαντήσεις. */
export function MessageList({ items, me, friend, dm, onAct, onOlder, intro, seenUpTo }) {
  const box = useRef(null), stick = useRef(true), [more, setMore] = useState(!dm), [edit, setEdit] = useState(null), [picker, setPicker] = useState(null), [hold, setHold] = useState(null), holdT = useRef(0);
  const onScroll = async () => { const el = box.current; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 90;
    if (el.scrollTop < 40 && more && onOlder) { const h = el.scrollHeight; const m = await onOlder(); setMore(m); requestAnimationFrame(() => { el.scrollTop = el.scrollHeight - h; }); } };
  useLayoutEffect(() => { const el = box.current; if (el && (stick.current || items[items.length - 1]?.pending)) el.scrollTop = el.scrollHeight; }, [items.length]); // eslint-disable-line
  useEffect(() => { const el = box.current; if (el) el.scrollTop = el.scrollHeight; }, []);
  useEffect(() => { if (picker === null && hold === null) return; const c = () => { setPicker(null); setHold(null); }; window.addEventListener('click', c); return () => window.removeEventListener('click', c); }, [picker, hold]);
  // στο κινητό: παρατεταμένο πάτημα σε μήνυμα → εργαλεία (αντίδραση, απάντηση, κ.λπ.)
  const press = (id) => ({ onTouchStart: () => { clearTimeout(holdT.current); holdT.current = setTimeout(() => { setHold(id); navigator.vibrate?.(12); }, 420); }, onTouchEnd: () => clearTimeout(holdT.current), onTouchMove: () => clearTimeout(holdT.current) });
  const mentionRe = new RegExp('@' + esc(me.nickname) + '(?![\\p{L}\\p{N}_])', 'iu');
  let prev = null;
  return (
    <div className="pc-feed" ref={box} onScroll={onScroll} role="log" aria-live="polite">
      {(!more || dm) && intro}
      {items.map((m, idx) => {
        const uid = dm ? (m.mine ? me.id : friend.id) : m.uid, mine = dm ? m.mine : m.uid === me.id;
        const nick = dm ? (m.mine ? me.nickname : friend.nickname) : m.nick, av = dm ? (m.mine ? me.avatar : friend.avatar) : m.avatar;
        const newDay = !prev || new Date(prev.at).toDateString() !== new Date(m.at).toDateString();
        const next = items[idx + 1];
        const first = newDay || !prev || prev._uid !== uid || new Date(m.at) - new Date(prev.at) > 5 * 60000 || !!m.reply;
        const nextSame = next && (dm ? (next.mine ? me.id : friend.id) : next.uid) === uid && new Date(next.at) - new Date(m.at) <= 5 * 60000 && !next.reply && new Date(next.at).toDateString() === new Date(m.at).toDateString();
        prev = { ...m, _uid: uid };
        const text = dm ? m.text : m.body;
        const ping = !dm && !mine && text && mentionRe.test(text);
        return (
          <div key={m.id} className="pc-row-wrap">
            {newDay && <div className="pc-day"><span>{day(m.at)}</span></div>}
            <div className={`pc-row${mine ? ' mine' : ''}${first ? ' first' : ''}${nextSame ? '' : ' last'}${m.fresh ? ' fresh' : ''}${m.pending ? ' pending' : ''}${m.deleted ? ' del' : ''}${ping ? ' ping' : ''}${m.staff ? ' staff' : ''}${hold === m.id ? ' tools-open' : ''}`} {...(!dm && !m.pending && !m.deleted ? press(m.id) : {})}>
              <span className="pc-row-av">{!mine && !nextSame ? <Mascot mood={av} size={30} /> : null}</span>
              <div className="pc-stack">
                {first && !mine && !dm && <div className="pc-who"><b>{nick}</b>{m.staff && <span className="pc-badge">Σύνταξη</span>}</div>}
                {m.reply && <div className="pc-quote"><Icon name="reply" size={13} /><b>{m.reply.nick}</b><span>{m.reply.body || 'διαγραμμένο μήνυμα'}</span></div>}
                <div className="pc-bubble">
                  {m.deleted ? <p className="pc-text dim">Το μήνυμα διαγράφηκε</p>
                    : edit === m.id ? <EditBox initial={text} onCancel={() => setEdit(null)} onSave={async (v) => { await onAct(m, 'edit', v); setEdit(null); }} />
                    : text === null ? <p className="pc-text dim"><Icon name="lock" size={13} /> Κρυπτογραφημένο μήνυμα από πριν συνδεθείς σε αυτή τη συσκευή</p>
                    : <p className="pc-text"><Fmt text={text || ''} me={me} /></p>}
                  <span className="pc-meta">{m.edited && 'επεξεργάστηκε · '}{m.pending ? 'αποστολή…' : time(m.at)}{dm && mine && !m.pending && seenUpTo >= m.id && <Icon name="checks" size={14} className="seen" title="Διαβάστηκε" />}</span>
                </div>
                {!dm && m.reactions?.length > 0 && <div className="pc-reacts">{m.reactions.map((r) => <button key={r.e} type="button" className={`pc-react${r.me ? ' me' : ''}`} onClick={() => onAct(m, 'react', r.e)} aria-label={`${r.e} ${r.n}`}>{r.e}<b>{r.n}</b></button>)}</div>}
              </div>
              {!m.deleted && !m.pending && !dm && <div className="pc-tools" onClick={(e) => e.stopPropagation()}>
                <button type="button" title="Αντίδραση" onClick={() => setPicker(picker === m.id ? null : m.id)}><Icon name="smile" size={17} /></button>
                <button type="button" title="Απάντηση" onClick={() => window.dispatchEvent(new CustomEvent('pc-reply', { detail: { id: m.id, nick, body: (text || '').slice(0, 100) } }))}><Icon name="reply" size={17} /></button>
                {mine ? <><button type="button" title="Επεξεργασία" onClick={() => setEdit(m.id)}><Icon name="edit" size={17} /></button><button type="button" title="Διαγραφή" onClick={() => onAct(m, 'delete')}><Icon name="trash" size={17} /></button></>
                  : <button type="button" title="Αναφορά" onClick={() => onAct(m, 'report')}><Icon name="flag" size={17} /></button>}
                {picker === m.id && <div className="pc-picker">{REACT.map((e) => <button key={e} type="button" onClick={() => { onAct(m, 'react', e); setPicker(null); }}>{e}</button>)}</div>}
              </div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
function EditBox({ initial, onSave, onCancel }) {
  const [v, setV] = useState(initial || '');
  return <div className="pc-edit"><textarea value={v} onChange={(e) => setV(e.target.value)} autoFocus rows={2} maxLength={2000} onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSave(v); } }} /><small>Esc ακύρωση · Enter αποθήκευση</small></div>;
}
/** Πεδίο γραφής: Enter αποστολή, Shift+Enter νέα γραμμή. */
export function Composer({ placeholder, onSend, onTyping, reply: canReply, disabled }) {
  const [v, setV] = useState(''), [err, setErr] = useState(''), [emo, setEmo] = useState(false), [reply, setReply] = useState(null), ta = useRef(null);
  useEffect(() => { if (!canReply) return; const on = (e) => { setReply(e.detail); ta.current?.focus(); }; window.addEventListener('pc-reply', on); return () => window.removeEventListener('pc-reply', on); }, [canReply]);
  useLayoutEffect(() => { const t = ta.current; if (t) { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 180) + 'px'; } }, [v]);
  useEffect(() => { if (window.matchMedia?.('(pointer:fine)').matches) ta.current?.focus(); }, []);
  const send = () => {
    const text = v.trim(); if (!text) return; setErr('');
    const r = reply; setV(''); setReply(null); ta.current?.focus();
    // η αποστολή δεν μπλοκάρει το πεδίο: το μήνυμα εμφανίζεται αμέσως και επιβεβαιώνεται στο παρασκήνιο
    Promise.resolve(onSend(text, r)).catch((e) => { setErr(e.message); setV((x) => x || text); });
  };
  return (
    <div className="pc-comp">
      {reply && <div className="pc-replying"><Icon name="reply" size={14} /><span>Απάντηση σε <b>{reply.nick}</b>: {reply.body}</span><button type="button" onClick={() => setReply(null)} aria-label="Ακύρωση απάντησης"><Icon name="x" size={14} /></button></div>}
      {err && <div className="pc-err" role="alert">{err}</div>}
      <div className="pc-input">
        <textarea ref={ta} rows={1} value={v} disabled={disabled} placeholder={placeholder} maxLength={2000} onChange={(e) => { setV(e.target.value); setErr(''); onTyping?.(); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }} aria-label={placeholder} />
        <button type="button" className="pc-ib" onClick={() => setEmo(!emo)} aria-label="Emoji" aria-expanded={emo}><Icon name="smile" /></button>
        <button type="button" className="pc-send" onClick={send} disabled={!v.trim() || disabled} aria-label="Αποστολή"><Icon name="send" size={18} /></button>
        {emo && <div className="pc-emoji">{EMOJI.map((e) => <button key={e} type="button" onClick={() => { setV((x) => x + e); setEmo(false); ta.current?.focus(); }}>{e}</button>)}</div>}
      </div>
    </div>
  );
}
