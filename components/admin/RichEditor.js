'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { toast, uploadImage } from '@/lib/clientUpload';
import ImageEditor, { editableImage } from './ImageEditor';

/* =====================================================================================
   Κειμενογράφος άρθρων.
   - Γραμμή εργαλείων με εικονίδια + μικρή γραμμή που εμφανίζεται όταν επιλέγεις κείμενο
   - «/» στην αρχή γραμμής: γρήγορη εισαγωγή (τίτλος, λίστα, εικόνα, πλαίσιο…)
   - Συντομεύσεις Markdown: «## » τίτλος, «- » λίστα, «1. » αριθμημένη, «> » παράθεμα
   - Εικόνες με λεζάντα, στοίχιση και επεξεργασία/περικοπή · επικόλληση/σύρσιμο εικόνων
   - Καθαρή επικόλληση από Word/Google Docs/ιστοσελίδες (κρατά μόνο τη βασική μορφοποίηση)
   - Αυτόματη αποθήκευση προχείρου στη συσκευή, στατιστικά, διόρθωση τυπογραφίας, λειτουργία εστίασης
   Η έξοδος είναι απλό, καθαρό HTML (το ίδιο που περνά από τον έλεγχο ασφαλείας του διακομιστή).
   ===================================================================================== */

const P = {
  bold: 'M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z', italic: 'M10 5h8M6 19h8M14 5l-4 14', underline: 'M7 4v7a5 5 0 0 0 10 0V4M5 20h14', strike: 'M5 12h14M16 6.5C15 5 13.6 4.5 12 4.5c-2.5 0-4 1.3-4 3 0 3.5 8 2.5 8 7 0 2-1.8 3.5-4.2 3.5-2 0-3.5-.8-4.5-2.3',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1', ul: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01', ol: 'M10 6h10M10 12h10M10 18h10M4 5h1.5v4M4 9h3M4 14.5c0-1 2.8-1 2.8.3 0 1-2.8 2.2-2.8 3.2h3',
  quote: 'M7 7h4v4c0 3-1.5 5-4 6M14 7h4v4c0 3-1.5 5-4 6', callout: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8h.01M11 12h1v5h1', image: 'M4 5h16v14H4zM4 15l4.5-4.5 4 4L15 12l5 5M15.5 8.5h.01',
  hr: 'M4 12h16', undo: 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11', redo: 'M15 14l5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13', clear: 'M6 5h12M12 5 9 19M4 20 20 4',
  expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5', shrink: 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5', magic: 'M5 19 15 9M14 4v2M19 9h2M17.5 5.5 16 7M4 20l1-1M18 4l2 2-1.5 1.5-2-2zM12 4l.5 1.5L14 6l-1.5.5L12 8l-.5-1.5L10 6l1.5-.5z',
  alignL: 'M4 6h16M4 10h8M4 14h8M4 18h16M14 10h6v4h-6z', alignC: 'M4 6h16M8 10h8v4H8zM4 18h16', alignW: 'M3 8h18v8H3zM6 5h12M6 19h12', alignR: 'M4 6h16M12 10h8M12 14h8M4 18h16M4 10h6v4H4z',
  crop: 'M6 2v14a2 2 0 0 0 2 2h14M2 6h14a2 2 0 0 1 2 2v14', trash: 'M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13', caption: 'M4 5h16v10H4zM7 19h10', alt: 'M4 6h16v12H4zM8 14l2-5 2 5M8.7 12.5h2.6M15 9v5',
  ext: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6', unlink: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-1.4-6.5M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 1.4 6.5M3 3l18 18',
};
const Ico = ({ n, s = 18 }) => <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={P[n]} /></svg>;

const SLASH = [
  { k: 'h2', l: 'Τίτλος', d: 'Μεγάλη επικεφαλίδα ενότητας', ic: 'H2', kw: 'titlos h2 heading epikefalida' },
  { k: 'h3', l: 'Υπότιτλος', d: 'Μικρότερη επικεφαλίδα', ic: 'H3', kw: 'ypotitlos h3' },
  { k: 'p', l: 'Κείμενο', d: 'Απλή παράγραφος', ic: '¶', kw: 'keimeno paragrafos text' },
  { k: 'ul', l: 'Λίστα', d: 'Λίστα με κουκκίδες', ic: 'ul', kw: 'lista bullets' },
  { k: 'ol', l: 'Αριθμημένη λίστα', d: '1, 2, 3…', ic: 'ol', kw: 'arithmimeni numbered' },
  { k: 'quote', l: 'Παράθεμα', d: 'Μια φράση που ξεχωρίζει', ic: 'quote', kw: 'parathema quote' },
  { k: 'info', l: 'Πλαίσιο πληροφορίας', d: 'Μπλε πλαίσιο με σημείωση', ic: 'callout', kw: 'plaisio info pliroforia' },
  { k: 'tip', l: 'Πλαίσιο συμβουλής', d: 'Πράσινο πλαίσιο με συμβουλή', ic: 'callout', kw: 'symvouli tip' },
  { k: 'warn', l: 'Πλαίσιο προσοχής', d: 'Κίτρινο πλαίσιο προειδοποίησης', ic: 'callout', kw: 'prosoxi warning' },
  { k: 'image', l: 'Εικόνα', d: 'Από τη βιβλιοθήκη ή από τον υπολογιστή', ic: 'image', kw: 'eikona image foto' },
  { k: 'hr', l: 'Διαχωριστικό', d: 'Οριζόντια γραμμή', ic: 'hr', kw: 'diaxoristiko grammi divider' },
];
// Για αναζήτηση με ελληνικά ή «greeklish»
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/* ---------- καθαρισμός επικολλημένου HTML ---------- */
const KEEP = { P: 'p', H1: 'h2', H2: 'h2', H3: 'h3', H4: 'h4', H5: 'h4', H6: 'h4', STRONG: 'strong', B: 'strong', EM: 'em', I: 'em', U: 'u', S: 's', STRIKE: 's', DEL: 's', BLOCKQUOTE: 'blockquote', UL: 'ul', OL: 'ol', LI: 'li', A: 'a', BR: 'br', CODE: 'code', SUB: 'sub', SUP: 'sup' };
const BLOCKISH = new Set(['DIV', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'TR', 'TABLE', 'TBODY']);
function cleanPaste(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html'), out = document.createElement('div');
  const walk = (node, into) => {
    for (const n of [...node.childNodes]) {
      if (n.nodeType === 3) { into.appendChild(document.createTextNode(n.textContent.replace(/ /g, ' '))); continue; }
      if (n.nodeType !== 1 || /^(SCRIPT|STYLE|META|LINK|TITLE|O:P|XML)$/i.test(n.tagName)) continue;
      const st = n.getAttribute('style') || '';
      let tag = KEEP[n.tagName];
      // Google Docs: έντονα/πλάγια με style αντί για <b>/<i>
      if (!tag && n.tagName === 'SPAN') { if (/font-weight:\s*(bold|[6-9]00)/.test(st)) tag = 'strong'; else if (/font-style:\s*italic/.test(st)) tag = 'em'; }
      if (n.tagName === 'B' && /font-weight:\s*normal/.test(st)) tag = null;
      if (tag) {
        const el = document.createElement(tag);
        if (tag === 'a') { const h = n.getAttribute('href') || ''; if (/^(https?:|mailto:|\/)/i.test(h)) el.setAttribute('href', h); else { walk(n, into); continue; } }
        walk(n, el); if (tag === 'br' || el.textContent.trim() || el.querySelector('br')) into.appendChild(el);
      } else if (BLOCKISH.has(n.tagName)) { const p = document.createElement('p'); walk(n, p); if (p.textContent.trim()) into.appendChild(p); }
      else walk(n, into);
    }
  };
  walk(doc.body, out);
  // χαλαρό κείμενο στην κορυφή → παράγραφοι
  const fin = document.createElement('div'); let cur = null;
  for (const n of [...out.childNodes]) {
    const inline = n.nodeType === 3 || /^(STRONG|EM|U|S|A|CODE|SUB|SUP|BR)$/.test(n.tagName);
    if (inline) { if (!cur) { cur = document.createElement('p'); fin.appendChild(cur); } cur.appendChild(n); } else { cur = null; fin.appendChild(n); }
  }
  fin.querySelectorAll('p').forEach((p) => { if (!p.textContent.trim()) p.remove(); });
  return fin.innerHTML;
}
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const textToHtml = (t) => t.replace(/\r/g, '').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean).map((b) => `<p>${esc(b).replace(/\n/g, '<br>')}</p>`).join('');

/* ---------- τυπογραφία ---------- */
function fixTypography(root) {
  let n = 0; const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
  for (const t of nodes) {
    if (t.parentElement?.closest('code,pre,a')) continue;
    const o = t.textContent;
    const v = o.replace(/\.{3}/g, '…').replace(/ {2,}/g, ' ').replace(/ ([,.;:!…])/g, '$1').replace(/ - /g, ' – ').replace(/"([^"\n]+)"/g, '«$1»').replace(/([«(]) /g, '$1').replace(/ ([»)])/g, '$1');
    if (v !== o) { t.textContent = v; n++; }
  }
  return n;
}

export default function RichEditor({ value, onChange, label = 'Κείμενο άρθρου', extra, placeholder = 'Γράψε εδώ… Πάτα «/» για γρήγορη εισαγωγή (τίτλος, εικόνα, πλαίσιο).', compact = false, draftKey }) {
  const wrap = useRef(null), ref = useRef(null), last = useRef(null), saveT = useRef(0);
  const [bubble, setBubble] = useState(null), [slash, setSlash] = useState(null), [linkPop, setLinkPop] = useState(null);
  const [fig, setFig] = useState(null), [figTick, setFigTick] = useState(0), [altEdit, setAltEdit] = useState(null);
  const [full, setFull] = useState(false), [stats, setStats] = useState({ w: 0, c: 0, long: 0, noalt: 0, h: 0 }), [draft, setDraft] = useState(null);
  const [picker, setPicker] = useState(false), [imgEd, setImgEd] = useState(null), [busy, setBusy] = useState(''), [block, setBlock] = useState('p');
  const savedRange = useRef(null);
  const Picker = useRef(null);
  useEffect(() => { import('./Fields').then((m) => { Picker.current = m.PickMedia; }); }, []);

  /* ----- σειριοποίηση: χωρίς τα βοηθητικά attributes ----- */
  const serialize = () => {
    const c = ref.current.cloneNode(true);
    c.querySelectorAll('[contenteditable]').forEach((e) => e.removeAttribute('contenteditable'));
    c.querySelectorAll('.rx-sel').forEach((e) => e.classList.remove('rx-sel'));
    c.querySelectorAll('[style]').forEach((e) => e.removeAttribute('style')); // ο browser προσθέτει inline styles· δεν τα θέλουμε
    c.querySelectorAll('span:not([class])').forEach((e) => e.replaceWith(...e.childNodes));
    c.querySelectorAll('b').forEach((e) => { const n = document.createElement('strong'); n.append(...e.childNodes); e.replaceWith(n); });
    c.querySelectorAll('i').forEach((e) => { const n = document.createElement('em'); n.append(...e.childNodes); e.replaceWith(n); });
    c.querySelectorAll('p:empty, figcaption:empty, strong:empty, em:empty').forEach((e) => e.remove());
    c.querySelectorAll('[class=""]').forEach((e) => e.removeAttribute('class'));
    return c.innerHTML.replace(/<p><br><\/p>/g, '');
  };
  const prepare = () => { ref.current?.querySelectorAll('figure').forEach((f) => { f.setAttribute('contenteditable', 'false'); f.querySelector('figcaption')?.setAttribute('contenteditable', 'true'); }); };
  const computeStats = () => {
    const el = ref.current; if (!el) return;
    const text = el.innerText || '', words = (text.match(/[\p{L}\p{N}]+/gu) || []).length;
    const long = [...el.querySelectorAll('p')].filter((p) => (p.innerText.match(/[\p{L}\p{N}]+/gu) || []).length > 110).length;
    setStats({ w: words, c: text.replace(/\s/g, '').length, long, noalt: [...el.querySelectorAll('img')].filter((i) => !i.getAttribute('alt')).length, h: el.querySelectorAll('h2,h3').length });
  };
  const emit = useCallback(() => {
    const html = serialize(); last.current = html; onChange(html); computeStats();
    if (draftKey) { clearTimeout(saveT.current); saveT.current = setTimeout(() => { try { localStorage.setItem('rx:' + draftKey, JSON.stringify({ html, at: Date.now() })); } catch {} }, 800); }
  }, [onChange, draftKey]); // eslint-disable-line

  // εξωτερική αλλαγή τιμής → ενημέρωση περιεχομένου (όχι όταν προήλθε από εμάς)
  useEffect(() => { const el = ref.current; if (!el) return; if ((value || '') !== last.current) { el.innerHTML = value || '<p><br></p>'; last.current = value || ''; prepare(); computeStats(); } }, [value]); // eslint-disable-line
  // πρόχειρο που δεν αποθηκεύτηκε
  useEffect(() => {
    if (!draftKey) return; try { const d = JSON.parse(localStorage.getItem('rx:' + draftKey) || 'null'); if (d?.html && d.html !== (value || '') && d.html.replace(/<[^>]+>/g, '').trim()) setDraft(d); } catch {}
    const clear = (e) => { if (!e.detail || e.detail === draftKey) { try { localStorage.removeItem('rx:' + draftKey); } catch {} setDraft(null); } };
    window.addEventListener('rx-saved', clear); return () => window.removeEventListener('rx-saved', clear);
  }, [draftKey]); // eslint-disable-line

  /* ----- βοηθητικά επιλογής ----- */
  const sel = () => window.getSelection();
  const inside = (n) => !!n && ref.current?.contains(n.nodeType === 3 ? n.parentNode : n);
  const curBlock = () => { let n = sel()?.anchorNode; if (!inside(n)) return null; while (n && n.parentNode !== ref.current) n = n.parentNode; return n; };
  const saveRange = () => { const s = sel(); if (s?.rangeCount && inside(s.anchorNode)) savedRange.current = s.getRangeAt(0).cloneRange(); };
  const restoreRange = () => { const r = savedRange.current; if (!r) { ref.current.focus(); return; } ref.current.focus(); const s = sel(); s.removeAllRanges(); s.addRange(r); };
  const exec = (c, a) => { ref.current.focus(); document.execCommand(c, false, a); emit(); refreshUi(); };
  const insertHTML = (html) => { restoreRange(); document.execCommand('insertHTML', false, html); prepare(); emit(); };
  const rel = (r) => { const w = wrap.current.getBoundingClientRect(); return { x: r.left - w.left + r.width / 2, y: r.top - w.top, b: r.bottom - w.top, l: r.left - w.left }; };

  const refreshUi = () => {
    const s = sel(); if (!s || !s.rangeCount || !inside(s.anchorNode)) { setBubble(null); return; }
    const b = curBlock(); const tag = b?.nodeName?.toLowerCase();
    setBlock(['h2', 'h3', 'h4', 'blockquote', 'ul', 'ol', 'aside'].includes(tag) ? tag : 'p');
    const r = s.getRangeAt(0);
    const a = (s.anchorNode.nodeType === 3 ? s.anchorNode.parentElement : s.anchorNode)?.closest('a');
    if (!s.isCollapsed && r.toString().trim()) { setBubble({ ...rel(r.getBoundingClientRect()), link: a?.getAttribute('href') || null }); }
    else if (a && inside(a)) setBubble({ ...rel(a.getBoundingClientRect()), link: a.getAttribute('href'), onlyLink: true, el: a });
    else setBubble(null);
    // «/» μενού
    if (s.isCollapsed && b && b.nodeName === 'P') {
      const t = b.textContent;
      if (t.startsWith('/') && t.length < 30 && !t.includes(' ')) { const rr = r.getBoundingClientRect(); const pos = rel(rr.width || rr.height ? rr : b.getBoundingClientRect()); setSlash((o) => ({ q: t.slice(1), i: o?.q === t.slice(1) ? o.i : 0, x: pos.l, y: pos.b + 6, block: b })); return; }
    }
    setSlash(null);
  };
  useEffect(() => { const f = () => refreshUi(); document.addEventListener('selectionchange', f); return () => document.removeEventListener('selectionchange', f); }); // eslint-disable-line

  /* ----- ενέργειες μπλοκ ----- */
  const setBlockType = (k) => {
    if (k === 'ul') return exec('insertUnorderedList'); if (k === 'ol') return exec('insertOrderedList');
    if (['info', 'tip', 'warn'].includes(k)) { const b = curBlock(); const has = !!(b && b.textContent.trim()), txt = has ? b.innerHTML : '<br>'; if (b && b !== ref.current) { const a = document.createElement('aside'); a.className = `callout callout-${k}`; a.innerHTML = `<p>${txt}</p>`; b.replaceWith(a); const r = document.createRange(); if (has) { r.selectNodeContents(a.firstChild); r.collapse(false); } else r.setStart(a.firstChild, 0); sel().removeAllRanges(); sel().addRange(r); emit(); } else insertHTML(`<aside class="callout callout-${k}"><p>${txt}</p></aside><p><br></p>`); return; }
    if (k === 'quote') { const b = curBlock(); return exec('formatBlock', b?.nodeName === 'BLOCKQUOTE' ? 'p' : 'blockquote'); }
    const b = curBlock();
    if (b?.nodeName === 'ASIDE') { const p = document.createElement(k); p.innerHTML = b.querySelector('p')?.innerHTML || b.innerHTML; b.replaceWith(p); emit(); return; }
    exec('formatBlock', k);
  };
  const runSlash = (it) => {
    const b = slash?.block; setSlash(null);
    if (b) { b.innerHTML = '<br>'; const r = document.createRange(); r.setStart(b, 0); r.collapse(true); sel().removeAllRanges(); sel().addRange(r); saveRange(); }
    if (it.k === 'image') { setPicker(true); return; }
    if (it.k === 'hr') { exec('insertHorizontalRule'); return; }
    setBlockType(it.k);
  };
  const slashItems = slash ? SLASH.filter((it) => !slash.q || norm(it.l + ' ' + it.kw).includes(norm(slash.q))) : [];

  /* ----- πληκτρολόγιο ----- */
  const onKeyDown = (e) => {
    if (slash && slashItems.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSlash({ ...slash, i: (slash.i + 1) % slashItems.length }); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSlash({ ...slash, i: (slash.i - 1 + slashItems.length) % slashItems.length }); return; }
      if (e.key === 'Enter') { e.preventDefault(); runSlash(slashItems[slash.i] || slashItems[0]); return; }
      if (e.key === 'Escape') { setSlash(null); return; }
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openLink(); return; }
    if (e.key === 'Escape' && full) { setFull(false); return; }
    // συντομεύσεις Markdown
    if (e.key === ' ') {
      const b = curBlock(), s = sel(); if (!b || !s.isCollapsed || b.nodeName !== 'P') return;
      const t = b.textContent, off = s.anchorOffset; if (s.anchorNode.nodeType !== 3 || s.anchorNode !== b.firstChild || off !== t.length || t.length > 3) return;
      const map = { '#': 'h2', '##': 'h2', '###': 'h3', '-': 'ul', '*': 'ul', '1.': 'ol', '>': 'quote' }; const k = map[t]; if (!k) return;
      e.preventDefault(); b.innerHTML = '<br>'; const r = document.createRange(); r.setStart(b, 0); r.collapse(true); s.removeAllRanges(); s.addRange(r); setBlockType(k);
    }
    // Enter στο τέλος τίτλου → νέα κανονική παράγραφος
    if (e.key === 'Enter' && !e.shiftKey) { const b = curBlock(); if (b && /^(H2|H3|H4)$/.test(b.nodeName)) setTimeout(() => { const nb = curBlock(); if (nb && /^(H2|H3|H4|DIV)$/.test(nb.nodeName) && !nb.textContent.trim()) { document.execCommand('formatBlock', false, 'p'); emit(); } }, 0); }
  };

  /* ----- σύνδεσμοι ----- */
  const openLink = () => { saveRange(); const r = savedRange.current; if (!r) return; const p = rel(r.getBoundingClientRect()); const a = (r.startContainer.nodeType === 3 ? r.startContainer.parentElement : r.startContainer)?.closest?.('a'); setLinkPop({ x: p.x, y: p.b + 8, url: a?.getAttribute('href') || 'https://' }); setBubble(null); };
  const applyLink = (url) => {
    setLinkPop(null); restoreRange(); url = url.trim(); if (!url || url === 'https://') return;
    if (!/^(https?:\/\/|mailto:|\/)/i.test(url)) url = 'https://' + url;
    if (sel().isCollapsed) document.execCommand('insertHTML', false, `<a href="${esc(url)}">${esc(url.replace(/^https?:\/\//, ''))}</a>`); else document.execCommand('createLink', false, url);
    emit();
  };

  /* ----- εικόνες ----- */
  const figHtml = (url) => `<figure class="img-center" contenteditable="false"><img src="${esc(url)}" alt=""><figcaption contenteditable="true"></figcaption></figure><p><br></p>`;
  const uploadFiles = async (files) => {
    const imgs = [...files].filter((f) => f.type.startsWith('image/')); if (!imgs.length) return false;
    for (const f of imgs) { try { setBusy(`Ανεβαίνει: ${f.name}`); const r = await uploadImage(f); insertHTML(figHtml(r.url)); } catch (err) { toast(err.message, 'oops'); } }
    setBusy(''); return true;
  };
  const onPaste = async (e) => {
    const cd = e.clipboardData; if (!cd) return;
    if (cd.files?.length && [...cd.files].some((f) => f.type.startsWith('image/'))) { e.preventDefault(); saveRange(); await uploadFiles(cd.files); return; }
    e.preventDefault();
    const html = cd.getData('text/html'), text = cd.getData('text/plain');
    const clean = html ? cleanPaste(html) : textToHtml(text);
    if (!clean) return;
    // μία μόνο γραμμή → ως κείμενο μέσα στην τρέχουσα παράγραφο
    if (!html && !/\n/.test(text.trim())) document.execCommand('insertText', false, text); else document.execCommand('insertHTML', false, clean);
    emit();
  };
  const onDrop = async (e) => {
    if (!e.dataTransfer?.files?.length) return; e.preventDefault();
    const r = document.caretRangeFromPoint?.(e.clientX, e.clientY); if (r) { sel().removeAllRanges(); sel().addRange(r); } saveRange();
    await uploadFiles(e.dataTransfer.files);
  };
  const onClick = (e) => {
    const f = e.target.closest('figure'), img = e.target.tagName === 'IMG' ? e.target : null;
    ref.current.querySelectorAll('.rx-sel').forEach((x) => x.classList.remove('rx-sel'));
    if (f && inside(f) && !e.target.closest('figcaption')) { f.classList.add('rx-sel'); setFig(f); setAltEdit(null); return; }
    if (img && inside(img)) { // παλιά εικόνα χωρίς figure → τη μετατρέπουμε
      const nf = document.createElement('figure'); nf.className = 'img-center'; nf.setAttribute('contenteditable', 'false'); const p = img.closest('p'); img.replaceWith(nf); nf.appendChild(img); const cap = document.createElement('figcaption'); cap.setAttribute('contenteditable', 'true'); nf.appendChild(cap);
      if (p && p.parentNode === ref.current && !p.textContent.trim() && !p.querySelector('img')) p.replaceWith(nf);
      nf.classList.add('rx-sel'); setFig(nf); emit(); return;
    }
    if (!f) setFig(null);
  };
  const figAct = (a) => {
    const f = fig; if (!f) return;
    if (a === 'del') { f.remove(); setFig(null); emit(); return; }
    if (a === 'cap') { const c = f.querySelector('figcaption'); if (c && c.textContent.trim()) c.textContent = ''; else if (c) { c.textContent = 'Λεζάντα'; const r = document.createRange(); r.selectNodeContents(c); sel().removeAllRanges(); sel().addRange(r); } emit(); setFigTick((x) => x + 1); return; }
    if (a === 'edit') { setImgEd(f.querySelector('img')); return; }
    if (a === 'alt') { setAltEdit(f.querySelector('img')?.getAttribute('alt') || ''); return; }
    f.className = 'rx-sel ' + a; emit(); setFigTick((x) => x + 1);
  };
  const figPos = fig && wrap.current && ref.current.contains(fig) ? rel(fig.getBoundingClientRect()) : null;
  useEffect(() => { if (!fig) return; const f = () => setFigTick((x) => x + 1); window.addEventListener('scroll', f, true); window.addEventListener('resize', f); return () => { window.removeEventListener('scroll', f, true); window.removeEventListener('resize', f); }; }, [fig]);
  useLayoutEffect(() => { computeStats(); }, []); // eslint-disable-line

  const typo = () => { const n = fixTypography(ref.current); emit(); toast(n ? `Διορθώθηκαν ${n} σημεία (εισαγωγικά «», αποσιωπητικά, παύλες, κενά).` : 'Η τυπογραφία είναι ήδη εντάξει!'); };
  const mins = Math.max(1, Math.round(stats.w / 200));
  const B = ({ n, t, on, onClick: oc, children }) => <button type="button" className={`rx-b${on ? ' on' : ''}`} title={t} aria-label={t} aria-pressed={on || undefined} onMouseDown={(e) => e.preventDefault()} onClick={oc}>{children || <Ico n={n} />}</button>;
  const PickMedia = Picker.current;
  const ww = wrap.current?.clientWidth || 800, cx = (x, half) => Math.max(half, Math.min(x, ww - half));

  return (
    <div className={`rx${full ? ' rx-full' : ''}${compact ? ' rx-compact' : ''}`} ref={wrap}>
      {draft && <div className="rx-draft" role="status"><span>Βρέθηκε πρόχειρο από {new Date(draft.at).toLocaleString('el-GR', { dateStyle: 'short', timeStyle: 'short' })} που δεν αποθηκεύτηκε.</span>
        <button type="button" onClick={() => { ref.current.innerHTML = draft.html; prepare(); emit(); setDraft(null); toast('Το πρόχειρο επανήλθε.'); }}>Επαναφορά</button>
        <button type="button" onClick={() => { try { localStorage.removeItem('rx:' + draftKey); } catch {} setDraft(null); }}>Απόρριψη</button></div>}
      <div className="rx-bar" role="toolbar" aria-label="Μορφοποίηση κειμένου">
        <select className="rx-sel-block" value={['ul', 'ol', 'aside'].includes(block) ? 'p' : block === 'blockquote' ? 'quote' : block} onMouseDown={saveRange} onChange={(e) => { restoreRange(); setBlockType(e.target.value); }} aria-label="Τύπος παραγράφου">
          <option value="p">Κείμενο</option><option value="h2">Τίτλος</option><option value="h3">Υπότιτλος</option><option value="h4">Μικρός τίτλος</option><option value="quote">Παράθεμα</option></select>
        <span className="rx-sep" />
        <B n="bold" t="Έντονα (Ctrl+B)" onClick={() => exec('bold')} /><B n="italic" t="Πλάγια (Ctrl+I)" onClick={() => exec('italic')} /><B n="underline" t="Υπογράμμιση (Ctrl+U)" onClick={() => exec('underline')} /><B n="strike" t="Διαγραμμένο" onClick={() => exec('strikeThrough')} />
        <B n="link" t="Σύνδεσμος (Ctrl+K)" onClick={openLink} />
        <span className="rx-sep" />
        <B n="ul" t="Λίστα" on={block === 'ul'} onClick={() => setBlockType('ul')} /><B n="ol" t="Αριθμημένη λίστα" on={block === 'ol'} onClick={() => setBlockType('ol')} /><B n="quote" t="Παράθεμα" on={block === 'blockquote'} onClick={() => setBlockType('quote')} />
        <B n="callout" t="Πλαίσιο πληροφορίας" on={block === 'aside'} onClick={() => setBlockType('info')} />
        <B n="image" t="Εικόνα" onClick={() => { saveRange(); setPicker(true); }} /><B n="hr" t="Διαχωριστική γραμμή" onClick={() => exec('insertHorizontalRule')} />
        <span className="rx-sep" />
        <B n="undo" t="Αναίρεση (Ctrl+Z)" onClick={() => exec('undo')} /><B n="redo" t="Επανάληψη (Ctrl+Y)" onClick={() => exec('redo')} /><B n="clear" t="Καθαρισμός μορφοποίησης" onClick={() => exec('removeFormat')} />
        <B n="magic" t="Διόρθωση τυπογραφίας («», …, –)" onClick={typo} />
        {extra && extra({ insert: (html) => insertHTML(html), focus: () => ref.current.focus() })}
        <span className="grow" />
        {!compact && <B n={full ? 'shrink' : 'expand'} t={full ? 'Έξοδος από εστίαση (Esc)' : 'Λειτουργία εστίασης'} onClick={() => setFull(!full)} />}
      </div>
      <div className="rx-scroll">
        <div ref={ref} className={`rx-body prose${compact ? ' rte-compact' : ''}`} data-ph={placeholder} contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label={label} spellCheck lang="el"
          onInput={emit} onFocus={() => { try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch {} }} onKeyDown={onKeyDown} onKeyUp={refreshUi} onMouseUp={refreshUi} onPaste={onPaste} onDrop={onDrop} onDragOver={(e) => e.dataTransfer?.types?.includes('Files') && e.preventDefault()} onClick={onClick} onBlur={() => setTimeout(() => { if (!wrap.current?.contains(document.activeElement)) setBubble(null); }, 150)} />
      </div>
      <div className="rx-foot" aria-live="polite">
        <span><b>{stats.w}</b> λέξεις</span><span><b>{stats.c}</b> χαρακτήρες</span><span>~<b>{mins}</b>′ ανάγνωση</span>
        {stats.w > 300 && stats.h === 0 && <span className="rx-tip">Πρόσθεσε υπότιτλους: βοηθούν τον αναγνώστη</span>}
        {stats.long > 0 && <span className="rx-tip">{stats.long} {stats.long === 1 ? 'πολύ μεγάλη παράγραφος' : 'πολύ μεγάλες παράγραφοι'}: σπάσ' τες στα δύο</span>}
        {stats.noalt > 0 && <span className="rx-tip">{stats.noalt} {stats.noalt === 1 ? 'εικόνα' : 'εικόνες'} χωρίς περιγραφή (alt)</span>}
        {busy && <span className="rx-busy">{busy}</span>}
        {draftKey && <span className="rx-saved">Το πρόχειρο κρατιέται αυτόματα σε αυτή τη συσκευή</span>}
      </div>

      {bubble && !linkPop && !fig && <div className="rx-bubble" style={{ left: cx(bubble.x, 150), top: bubble.y - 8 }} onMouseDown={(e) => e.preventDefault()}>
        {bubble.onlyLink ? <><a className="rx-url" href={bubble.link} target="_blank" rel="noopener noreferrer">{bubble.link?.replace(/^https?:\/\//, '').slice(0, 38)}<Ico n="ext" s={14} /></a>
          <button type="button" title="Αλλαγή" onClick={() => { const r = document.createRange(); r.selectNodeContents(bubble.el); sel().removeAllRanges(); sel().addRange(r); openLink(); }}><Ico n="link" s={16} /></button>
          <button type="button" title="Αφαίρεση συνδέσμου" onClick={() => { const r = document.createRange(); r.selectNodeContents(bubble.el); sel().removeAllRanges(); sel().addRange(r); exec('unlink'); }}><Ico n="unlink" s={16} /></button></>
          : <><button type="button" title="Έντονα" onClick={() => exec('bold')}><Ico n="bold" s={16} /></button><button type="button" title="Πλάγια" onClick={() => exec('italic')}><Ico n="italic" s={16} /></button><button type="button" title="Υπογράμμιση" onClick={() => exec('underline')}><Ico n="underline" s={16} /></button>
            <button type="button" title="Σύνδεσμος" onClick={openLink}><Ico n="link" s={16} /></button><i />
            <button type="button" className="rx-tx" title="Τίτλος" onClick={() => setBlockType('h2')}>Τ</button><button type="button" className="rx-tx sm" title="Υπότιτλος" onClick={() => setBlockType('h3')}>Τ</button>
            <button type="button" title="Παράθεμα" onClick={() => setBlockType('quote')}><Ico n="quote" s={16} /></button><button type="button" title="Καθαρισμός" onClick={() => exec('removeFormat')}><Ico n="clear" s={16} /></button></>}
      </div>}
      {linkPop && <form className="rx-linkpop" style={{ left: cx(linkPop.x, 230), top: linkPop.y }} onSubmit={(e) => { e.preventDefault(); applyLink(e.currentTarget.url.value); }}>
        <input name="url" defaultValue={linkPop.url} autoFocus onFocus={(e) => e.target.select()} aria-label="Διεύθυνση συνδέσμου" placeholder="https://…" onKeyDown={(e) => e.key === 'Escape' && setLinkPop(null)} />
        <button type="submit">Εφαρμογή</button><button type="button" className="ghost" onClick={() => setLinkPop(null)}>Άκυρο</button></form>}
      {slash && slashItems.length > 0 && <div className="rx-slash" style={{ left: Math.min(slash.x, ww - 300), top: slash.y }} role="listbox" onMouseDown={(e) => e.preventDefault()}>
        <small>Εισαγωγή</small>
        {slashItems.map((it, i) => <button key={it.k} type="button" role="option" aria-selected={i === slash.i} className={i === slash.i ? 'on' : ''} onMouseEnter={() => setSlash({ ...slash, i })} onClick={() => runSlash(it)}>
          <span className="rx-si">{P[it.ic] ? <Ico n={it.ic} /> : <b>{it.ic}</b>}</span><span><b>{it.l}</b><em>{it.d}</em></span></button>)}</div>}
      {figPos && <div className="rx-figbar" style={{ left: cx(figPos.x, 170), top: Math.max(46, figPos.y - 10) }} key={figTick} onMouseDown={(e) => e.target.tagName !== 'INPUT' && e.preventDefault()}>
        {altEdit !== null ? <form className="rx-altf" onSubmit={(e) => { e.preventDefault(); fig.querySelector('img')?.setAttribute('alt', e.currentTarget.alt.value.trim()); setAltEdit(null); emit(); }}>
          <input name="alt" defaultValue={altEdit} autoFocus placeholder="Τι δείχνει η εικόνα; (για τυφλούς αναγνώστες και τη Google)" aria-label="Περιγραφή εικόνας" /><button type="submit">OK</button></form> : <>
          {[['img-left', 'alignL', 'Αριστερά, με κείμενο δίπλα'], ['img-center', 'alignC', 'Στο κέντρο'], ['img-wide', 'alignW', 'Σε όλο το πλάτος'], ['img-right', 'alignR', 'Δεξιά, με κείμενο δίπλα']].map(([c, n, t]) => <button key={c} type="button" title={t} className={fig.classList.contains(c) ? 'on' : ''} onClick={() => figAct(c)}><Ico n={n} s={17} /></button>)}<i />
          {editableImage(fig.querySelector('img')?.getAttribute('src')) && <button type="button" title="Επεξεργασία / περικοπή" onClick={() => figAct('edit')}><Ico n="crop" s={17} /></button>}
          <button type="button" title="Περιγραφή εικόνας (alt)" className={fig.querySelector('img')?.getAttribute('alt') ? 'on' : ''} onClick={() => figAct('alt')}><Ico n="alt" s={17} /></button>
          <button type="button" title="Λεζάντα" className={fig.querySelector('figcaption')?.textContent.trim() ? 'on' : ''} onClick={() => figAct('cap')}><Ico n="caption" s={17} /></button><i />
          <button type="button" title="Διαγραφή εικόνας" className="danger" onClick={() => figAct('del')}><Ico n="trash" s={17} /></button></>}
      </div>}
      {picker && PickMedia && <PickMedia allowVideo={false} onClose={() => setPicker(false)} onPick={(u) => { setPicker(false); insertHTML(figHtml(u)); }} />}
      {imgEd && <ImageEditor src={imgEd.getAttribute('src')} onClose={() => setImgEd(null)} onDone={(u) => { imgEd.setAttribute('src', u); setImgEd(null); emit(); }} />}
    </div>
  );
}
