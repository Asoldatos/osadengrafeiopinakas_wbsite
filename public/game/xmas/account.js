// Αποθήκευση προόδου στον λογαριασμό μαθητή του osaden.gr.
// Το παιχνίδι τρέχει στο ίδιο domain με το site, άρα το cookie σύνδεσης στέλνεται αυτόματα — δεν υπάρχει κανένα κλειδί εδώ.
const API = '/api/play/xmas3d';
const LS = (k, d) => { try { return JSON.parse(localStorage.getItem('kimo3d:' + k)) ?? d; } catch { return d; } };
const LSset = (k, v) => { try { localStorage.setItem('kimo3d:' + k, JSON.stringify(v)); } catch {} };
const SS = (k, v) => { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch {} return null; };
const LAST = 6;

/** Τι λέει αυτή η συσκευή: μέχρι ποιο κεφάλαιο έφτασε και αν το τελείωσε (και για όσους το τελείωσαν πριν υπάρξει αποθήκευση). */
export function localProgress() {
  const max = Number(LS('max', 0)) || 0, save = LS('save', null), done = LS('done', false) === true || (max >= LAST && save && save.ch === 0);
  return { maxCh: Math.min(LAST, max), completed: !!done };
}

export class Account {
  constructor(ui) { this.ui = ui; this.student = null; this.server = null; this.online = false; }
  async refresh() {
    try { const r = await fetch(API, { credentials: 'same-origin', cache: 'no-store' }); if (!r.ok) throw 0; const j = await r.json(); this.student = j.student; this.server = j.progress; this.online = true; }
    catch { this.online = false; }
    // ό,τι έχει ο λογαριασμός ξεκλειδώνει και εδώ (π.χ. έπαιξες σε άλλη συσκευή)
    if (this.server) { if (this.server.max_ch > LS('max', 0)) LSset('max', this.server.max_ch); if (this.server.completed) LSset('done', true); }
    this.render(); return this;
  }
  get saved() { const l = localProgress(), s = this.server; return !!s && s.max_ch >= l.maxCh && (s.completed || !l.completed); }
  /** Στέλνει την πρόοδο (μόνο αν είσαι συνδεδεμένος). */
  async push({ maxCh, completed = false, source = 'live' } = {}) {
    if (!this.student) return null;
    try {
      const r = await fetch(API, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ maxCh, completed, source }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Σφάλμα'); this.server = j.progress; this.render(); return j;
    } catch (e) { console.warn('save', e); return null; }
  }
  /** Γραμμή κατάστασης στο αρχικό μενού. */
  render() {
    const el = document.querySelector('#acct'); if (!el) return;
    if (!this.online) { el.hidden = true; return; }
    el.hidden = false;
    if (this.student) el.innerHTML = `☁️ Συνδεδεμένος ως <b>${esc(this.student.nickname || this.student.email)}</b> · η πρόοδος αποθηκεύεται${this.server?.completed ? ' · 🎄 Ολοκληρώθηκε' : ''}`;
    else el.innerHTML = `⚠️ Δεν είσαι συνδεδεμένος — η πρόοδος μένει μόνο σε αυτή τη συσκευή. <a href="${loginUrl()}">Σύνδεση για αποθήκευση</a>`;
  }
  /** Το παράθυρο «Αποθήκευση»: για όσους έχουν πρόοδο/ολοκλήρωση εδώ που δεν έχει περάσει στον λογαριασμό. */
  maybeClaim({ force = false } = {}) {
    if (!this.online) return;
    const l = localProgress(); if (!l.completed && l.maxCh < 1) return;
    if (this.saved) return;
    if (!force && SS('kimo3d:claimLater')) return;
    showClaim(this, l);
  }
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const loginUrl = (email = '') => `/account/login?next=${encodeURIComponent('/game/xmas/index.html?claim=1')}${email ? '&email=' + encodeURIComponent(email) : ''}`;

function showClaim(acc, l) {
  const m = document.querySelector('#claim'); if (!m) return;
  const what = l.completed ? 'Τελείωσες «Τα Χριστούγεννα του Κιμωλάκη»!' : `Έφτασες στο κεφάλαιο ${l.maxCh + 1} από 7!`;
  const prize = l.completed ? 'Αποθήκευσέ το στον λογαριασμό σου για να πάρεις το παράσημο 🎄 <b>Ήρωας των Χριστουγέννων</b> και <b>150 XP</b>.' : 'Αποθήκευσέ το στον λογαριασμό σου για να συνεχίσεις από οποιαδήποτε συσκευή.';
  m.querySelector('h2').textContent = what; m.querySelector('.prize').innerHTML = prize;
  const inBox = m.querySelector('.in'), outBox = m.querySelector('.out'), msg = m.querySelector('.msg');
  inBox.hidden = !acc.student; outBox.hidden = !!acc.student; msg.textContent = '';
  if (acc.student) inBox.querySelector('.who').textContent = acc.student.nickname ? `${acc.student.nickname} (${acc.student.email})` : acc.student.email;
  m.hidden = false;
  m.querySelector('.save').onclick = async (e) => {
    e.target.disabled = true; msg.textContent = 'Αποθήκευση…';
    const r = await acc.push({ maxCh: l.maxCh, completed: l.completed, source: 'claim' });
    e.target.disabled = false;
    if (!r) { msg.textContent = 'Δεν έγινε η αποθήκευση. Δοκίμασε ξανά.'; return; }
    const rw = r.reward; msg.innerHTML = rw ? `✅ Αποθηκεύτηκε! Κέρδισες <b>${rw.gained} XP</b>${rw.badges?.includes('xmas-hero') ? ' και το παράσημο 🎄' : ''}!` : '✅ Αποθηκεύτηκε στον λογαριασμό σου!';
    setTimeout(() => { m.hidden = true; }, 2200);
  };
  m.querySelector('form').onsubmit = (e) => { e.preventDefault(); const email = m.querySelector('input[type=email]').value.trim(); location.href = loginUrl(email); };
  m.querySelector('.later').onclick = () => { SS('kimo3d:claimLater', '1'); m.hidden = true; };
}
