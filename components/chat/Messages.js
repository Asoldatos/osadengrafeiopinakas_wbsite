'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Mascot from '../Mascot';
import { parseFmt } from '@/lib/chatClient';

const REACT = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👏', '🤔', '✅'];
const EMOJI = ['😀', '😂', '🥹', '😍', '😎', '🤩', '🥳', '😅', '😮', '😢', '😡', '🤔', '👍', '👏', '🙌', '💪', '🔥', '✨', '🎉', '❤️', '💙', '💚', '📚', '✏️', '🎮', '⚽', '🎵', '🍕'];
const time = (d) => new Date(d).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
const day = (d) => new Date(d).toLocaleDateString('el-GR', { weekday: 'long', day: 'numeric', month: 'long' });

function Fmt({ text, me }) {
  return parseFmt(text).map((p, i) => p.t === 'b' ? <b key={i}>{p.v}</b> : p.t === 'i' ? <i key={i}>{p.v}</i> : p.t === 's' ? <s key={i}>{p.v}</s> : p.t === 'code' ? <code key={i}>{p.v}</code>
    : p.t === 'spoiler' ? <Spoiler key={i} v={p.v} /> : p.t === 'mention' ? <span key={i} className={`cx-mention${p.v.slice(1).toLowerCase() === me.nickname.toLowerCase() ? ' me' : ''}`}>{p.v}</span> : <span key={i}>{p.v}</span>);
}
function Spoiler({ v }) { const [o, setO] = useState(false); return <span className={`cx-spoiler${o ? ' open' : ''}`} onClick={() => setO(true)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setO(true)}>{v}</span>; }

/** Λίστα μηνυμάτων: ομαδοποίηση ανά συντάκτη, διαχωριστικά ημέρας, αντιδράσεις, απαντήσεις, κινούμενη είσοδος νέων μηνυμάτων. */
export function MessageList({ items, me, friend, dm, onAct, onOlder, intro, seenUpTo }) {
  const box = useRef(null), stick = useRef(true), [more, setMore] = useState(!dm), [edit, setEdit] = useState(null), [picker, setPicker] = useState(null);
  const onScroll = async () => { const el = box.current; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (el.scrollTop < 40 && more && onOlder) { const h = el.scrollHeight; const m = await onOlder(); setMore(m); requestAnimationFrame(() => { el.scrollTop = el.scrollHeight - h; }); } };
  useLayoutEffect(() => { const el = box.current; if (el && stick.current) el.scrollTop = el.scrollHeight; }, [items.length]);
  useEffect(() => { const el = box.current; if (el) el.scrollTop = el.scrollHeight; }, []);
  let prev = null;
  return (
    <div className="cx-msgs" ref={box} onScroll={onScroll} role="log" aria-live="polite">
      {(!more || dm) && intro}
      {items.map((m) => {
        const uid = dm ? (m.mine ? me.id : friend.id) : m.uid, nick = dm ? (m.mine ? me.nickname : friend.nickname) : m.nick, av = dm ? (m.mine ? me.avatar : friend.avatar) : m.avatar;
        const newDay = !prev || new Date(prev.at).toDateString() !== new Date(m.at).toDateString();
        const grouped = !newDay && prev && prev._uid === uid && new Date(m.at) - new Date(prev.at) < 5 * 60000 && !m.reply;
        prev = { ...m, _uid: uid };
        const mine = dm ? m.mine : m.uid === me.id;
        const text = dm ? m.text : m.body;
        return (
          <div key={m.id} className="cx-mwrap">
            {newDay && <div className="cx-day"><span>{day(m.at)}</span></div>}
            <div className={`cx-m${grouped ? ' g' : ''}${m.fresh ? (mine ? ' sent' : ' new') : ''}${m.deleted ? ' del' : ''}${!dm && text && new RegExp('@' + me.nickname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(text) ? ' ping' : ''}`}>
              {m.reply && <div className="cx-reply"><span>↱</span><b>@{m.reply.nick}</b> {m.reply.body || <i>διαγραμμένο μήνυμα</i>}</div>}
              {!grouped ? <span className="cx-mav"><Mascot mood={av} size={40} /></span> : <span className="cx-mtime">{time(m.at)}</span>}
              <div className="cx-mb">
                {!grouped && <div className="cx-mh"><b className={m.staff ? 'staff' : ''}>{nick}</b>{m.staff && <span className="cx-tag">ΣΥΝΤΑΞΗ</span>}<time>{time(m.at)}</time></div>}
                {m.deleted ? <p className="cx-mt dim"><i>Το μήνυμα διαγράφηκε.</i></p>
                  : edit === m.id ? <EditBox initial={text} onCancel={() => setEdit(null)} onSave={async (v) => { await onAct(m, 'edit', v); setEdit(null); }} />
                  : text === null ? <p className="cx-mt dim">🔒 <i>Κρυπτογραφημένο μήνυμα από πριν συνδεθείς σε αυτή τη συσκευή.</i></p>
                  : <p className="cx-mt"><Fmt text={text || ''} me={me} />{m.edited && <small className="cx-ed"> (επεξεργασμένο)</small>}</p>}
                {!dm && m.reactions?.length > 0 && <div className="cx-reacts">{m.reactions.map((r) => <button key={r.e} type="button" className={`cx-react${r.me ? ' me' : ''}`} onClick={() => onAct(m, 'react', r.e)}>{r.e}<b>{r.n}</b></button>)}</div>}
                {dm && m.mine && seenUpTo >= m.id && m === items[items.length - 1] && <small className="cx-seen">✓✓ Διαβάστηκε</small>}
              </div>
              {!m.deleted && !dm && <div className="cx-tools">
                {REACT.slice(0, 3).map((e) => <button key={e} type="button" onClick={() => onAct(m, 'react', e)} title="Αντίδραση">{e}</button>)}
                <button type="button" title="Περισσότερες αντιδράσεις" onClick={() => setPicker(picker === m.id ? null : m.id)}>😀</button>
                <button type="button" title="Απάντηση" onClick={() => window.dispatchEvent(new CustomEvent('cx-reply', { detail: { id: m.id, nick, body: (text || '').slice(0, 100) } }))}>↩️</button>
                {mine ? <><button type="button" title="Επεξεργασία" onClick={() => setEdit(m.id)}>✏️</button><button type="button" title="Διαγραφή" onClick={() => onAct(m, 'delete')}>🗑️</button></> : <button type="button" title="Αναφορά" onClick={() => onAct(m, 'report')}>🚩</button>}
                {picker === m.id && <div className="cx-picker">{REACT.map((e) => <button key={e} type="button" onClick={() => { onAct(m, 'react', e); setPicker(null); }}>{e}</button>)}</div>}
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
  return <div className="cx-edit"><textarea value={v} onChange={(e) => setV(e.target.value)} autoFocus rows={2} maxLength={2000} onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSave(v); } }} /><small>Esc για ακύρωση · Enter για αποθήκευση</small></div>;
}
/** Πεδίο γραφής: Enter αποστολή, Shift+Enter νέα γραμμή, emoji, απάντηση σε μήνυμα. */
export function Composer({ placeholder, onSend, onTyping, reply: canReply, disabled }) {
  const [v, setV] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [emo, setEmo] = useState(false), [reply, setReply] = useState(null), ta = useRef(null);
  useEffect(() => { if (!canReply) return; const on = (e) => { setReply(e.detail); ta.current?.focus(); }; window.addEventListener('cx-reply', on); return () => window.removeEventListener('cx-reply', on); }, [canReply]);
  useLayoutEffect(() => { const t = ta.current; if (t) { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 200) + 'px'; } }, [v]);
  const send = async () => {
    const text = v.trim(); if (!text || busy) return; setBusy(true); setErr('');
    try { await onSend(text, reply); setV(''); setReply(null); } catch (e) { setErr(e.message); }
    setBusy(false); ta.current?.focus();
  };
  return (
    <div className="cx-comp">
      {reply && <div className="cx-replying">Απάντηση στον/στην <b>@{reply.nick}</b><span>{reply.body}</span><button type="button" onClick={() => setReply(null)} aria-label="Ακύρωση απάντησης">✕</button></div>}
      {err && <div className="cx-err" role="alert">{err}</div>}
      <div className={`cx-input${busy ? ' busy' : ''}`}>
        <textarea ref={ta} rows={1} value={v} disabled={disabled} placeholder={placeholder} maxLength={2000} onChange={(e) => { setV(e.target.value); setErr(''); onTyping?.(); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }} aria-label={placeholder} />
        <button type="button" className="cx-ib" onClick={() => setEmo(!emo)} aria-label="Emoji">😊</button>
        <button type="button" className="cx-send" onClick={send} disabled={!v.trim() || busy || disabled} aria-label="Αποστολή">➤</button>
        {emo && <div className="cx-emoji">{EMOJI.map((e) => <button key={e} type="button" onClick={() => { setV((x) => x + e); setEmo(false); ta.current?.focus(); }}>{e}</button>)}</div>}
      </div>
      <small className="cx-hint">**έντονα** · *πλάγια* · ~~διαγραφή~~ · `κώδικας` · ||spoiler|| · @όνομα</small>
    </div>
  );
}
