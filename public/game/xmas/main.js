// Εκκίνηση: φόρτωση, μενού, ανίχνευση VR, ρυθμίσεις, παύση, πλήρης οθόνη στα κινητά.
import { THREE, DEVICE, VR, defaultQuality } from './engine.js';
import { Account, localProgress } from './account.js';
import { Game } from './game.js';
import { CHAPTERS, play } from './story.js';
import { height, P } from './world.js';
import { VR_CONTROLS } from './vrmenu.js';
import { VRSite } from './vrsite.js';

const $ = (s) => document.querySelector(s), app = $('#app');
const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem('kimo3d:' + k)) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem('kimo3d:' + k, JSON.stringify(v)); } catch {} } };
const qs = new URLSearchParams(location.search);
const SITE_MODE = qs.get('vrsite') != null;   // ήρθες από τον ιστότοπο με «Ναι, σε VR»
const qName = qs.get('q') || store.get('quality', defaultQuality());
let g, wantVR = false, playing = false;

const acct = (window.__acct = new Account());
/** Μετά τη σύνδεση (…?claim=1): αποθηκεύει αμέσως ό,τι υπάρχει σε αυτή τη συσκευή. */
async function claimAfterLogin() {
  try { history.replaceState(null, '', location.pathname); } catch {}
  const l = localProgress();
  if (!l.completed && l.maxCh < 1) return;   // τίποτα να αποθηκευτεί από αυτή τη συσκευή
  if (!acct.student) { acct.maybeClaim({ force: true }); return; }
  if (acct.saved) { alertBox('✅ Η πρόοδός σου είναι ήδη αποθηκευμένη στον λογαριασμό σου!'); return; }
  const r = await acct.push({ maxCh: l.maxCh, completed: l.completed, source: 'claim' });
  alertBox(r ? (r.reward?.gained ? `✅ Αποθηκεύτηκε στον λογαριασμό σου! Κέρδισες ${r.reward.gained} XP${r.reward.badges?.includes('xmas-hero') ? ' και το παράσημο 🎄 «Ήρωας των Χριστουγέννων»' : ''}!` : '✅ Η πρόοδός σου αποθηκεύτηκε στον λογαριασμό σου!') : 'Δεν έγινε η αποθήκευση. Δοκίμασε ξανά σε λίγο.');
  renderMenu();
}
async function boot() {
  $('#load b').textContent = 'Χτίζεται ο χιονισμένος κόσμος…';
  await new Promise((r) => setTimeout(r, 30));
  g = window.__game = new Game(app, qName);
  g.gender = store.get('gender', 'm'); g.setPlayerLook(g.gender);
  g.vrSite = new VRSite(g, { onGame: vrGoGame });
  // φόρτωση ήχων στο παρασκήνιο (δεν χρειάζεται «άδεια» για αποκωδικοποίηση)
  for (const u of ['../../audio/christmas-music.mp3', '../../audio/sfx/pop.mp3', '../../audio/sfx/click.mp3', '../../audio/christmas-sfx.mp3', '../../audio/sfx/swell.mp3']) g.audio.load(u);
  menuCamera(); g.fadeTo(0, 1.4);
  $('#load').classList.add('out'); setTimeout(() => $('#load').remove(), 700);
  renderMenu(); showMenu(true);
  acct.refresh().then(() => { renderMenu(); if (qs.get('claim') != null) claimAfterLogin(); else if (qs.get('autostart') == null) setTimeout(() => acct.maybeClaim(), 900); });
  g.onVRPause = vrPause; g.onVRExit = () => {
    // από τον ιστότοπο σε VR: βγαίνοντας γυρνάς στη σελίδα που διάβαζες (ή σε όποια ζήτησες «έξω από το VR»), στην ίδια καρτέλα
    const to = g.vrSite.leaveTo || (SITE_MODE && !playing ? g.vrSite.path : null);
    g.vrSite.hide(); g.vrMenu.close();
    if (to) { $('#load')?.remove(); document.body.classList.add('leaving'); location.href = safePath(to); return; }
    if (!playing) { showMenu(true); menuCamera(); } else g.kid.root.visible = true; g.rig.scale.setScalar(1);
  };
  if (SITE_MODE) { showMenu(false); if (await VR.supported()) $('#vrEnter').hidden = false; else location.replace(safePath(qs.get('from'))); return; }
  if (await VR.supported()) { $('#vrBadge').hidden = false; if (DEVICE.quest) $('#tipQuest').hidden = false; if (!store.get('vrAsked', false) || DEVICE.quest) showVRPrompt(); }
  else if (!DEVICE.touch) $('#tipDesktop').hidden = false;
  if (DEVICE.touch) $('#tipMobile').hidden = false;
  addEventListener('keydown', (e) => { if (e.code === 'Escape' && playing && !g.inVR) togglePause(true); });
  document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && playing && !g.paused && !DEVICE.touch && !g.inVR && !g.ui.cur) togglePause(true); });
  g.renderer.domElement.addEventListener('click', () => { if (playing && !g.paused && !g.inVR) g.input.lock(); });
  if (qs.get('autostart') != null) start(Number(qs.get('ch') || 1) - 1);
}

/** Αργή «περιήγηση» της κάμερας στο χωριό πίσω από το μενού. */
function menuCamera() {
  g.locked = true; g.kid.root.visible = false; g.world.setIndoor(false); g.world.setTime('sunset', 0.01); g.world.bigTree.lit(1);
  let a = 0; g.tick = (dt) => { if (playing) return; a += dt * 0.05; const c = new THREE.Vector3(Math.sin(a) * 60, 26, Math.cos(a) * 60 - 20); g.cine = { pos: c, look: new THREE.Vector3(0, 3, -24), speed: 3 }; };
}

function renderMenu() {
  const save = store.get('save', null), max = store.get('max', 0), all = qs.get('all') != null;
  $('#mContinue').hidden = !save || !save.ch; if (save?.ch) $('#mContinue').innerHTML = `Συνέχεια <small>Κεφάλαιο ${save.ch + 1}: ${CHAPTERS[save.ch].title}</small>`;
  $('#chList').innerHTML = CHAPTERS.map((c, i) => `<button type="button" data-ch="${i}" ${i > max && !all ? 'disabled' : ''}><b>${c.n}</b>${i > max && !all ? '🔒 Κλειδωμένο' : c.title}</button>`).join('');
  $('#chList').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => start(Number(b.dataset.ch))));
  $('#sQuality').value = qName; $('#sSens').value = g.input.sens; $('#sMusic').value = g.audio.vol.music; $('#sSfx').value = g.audio.vol.sfx; $('#sVoice').value = g.audio.vol.voice ?? 1; $('#sCam').value = g.camMode; $('#sTut').value = g.settings.tutorials ? '1' : '0';
  document.querySelectorAll('[data-gender]').forEach((b) => b.classList.toggle('on', b.dataset.gender === g.gender));
}
function showMenu(on, panel = 'main') {
  $('#menu').hidden = !on; document.querySelectorAll('#menu .panel').forEach((p) => { p.hidden = p.dataset.p !== panel; });
}
function showVRPrompt() { $('#vrPrompt').hidden = false; store.set('vrAsked', true); }

async function start(ch) {
  const save = store.get('save', null);
  if (ch == null) ch = save?.ch || 0;
  // Το VR πρέπει να ζητηθεί αμέσως μετά το πάτημα (πριν από οποιαδήποτε αναμονή), αλλιώς ο browser το αρνείται.
  g.vrMenu.close(); let vrStart = null; if (wantVR && !g.inVR) vrStart = g.enterVR().catch((e) => { alertBox('Δεν ξεκίνησε το VR: ' + (e.message || e)); wantVR = false; });
  let fs = null; if (DEVICE.touch && !wantVR) fs = document.documentElement.requestFullscreen?.({ navigationUI: 'hide' })?.then(() => screen.orientation?.lock?.('landscape')).catch(() => {});
  showMenu(false); $('#tipDesktop').hidden = $('#tipMobile').hidden = $('#tipQuest').hidden = true; $('#pause').hidden = true;
  await g.audio.unlock();
  if (DEVICE.touch && !wantVR) { await fs; if (!g.input.touchEl) g.input.buildTouch(app); g.input.touchEl.hidden = false; }
  if (vrStart) await vrStart;
  else if (!DEVICE.touch && !g.inVR) g.input.lock();
  playing = true; g.locked = false; g.cine = null; g.tick = null; g.paused = false; g.kid.root.visible = !g.inVR; document.body.classList.add('playing');
  await g.fadeTo(1, 0.5);
  await play(g, ch, (i) => { store.set('save', { ch: i }); store.set('max', Math.max(store.get('max', 0), i)); acct.push({ maxCh: store.get('max', 0) }); });
  // τέλος
  playing = false; document.body.classList.remove('playing'); store.set('max', CHAPTERS.length - 1); store.set('done', true);
  acct.push({ maxCh: CHAPTERS.length - 1, completed: true }).then((r) => { if (r?.reward?.gained) g.ui.toast(`🎄 Αποθηκεύτηκε στον λογαριασμό σου! +${r.reward.gained} XP`, 4000); else if (!acct.student) setTimeout(() => acct.maybeClaim({ force: true }), 1800); }); if (document.pointerLockElement) document.exitPointerLock();
  g.reset(); menuCamera(); await g.fadeTo(0, 1.5); renderMenu(); showMenu(true, 'end');
  if (g.inVR) { vrViewpoint(); vrPage('end'); }
}
function togglePause(on) {
  if (!playing) return; g.paused = on; $('#pause').hidden = !on; g.audio.musicVol(on ? 0.08 : (g.audio.music ? 0.4 : 0));
  if (!on && !DEVICE.touch) g.input.lock();
}
// ---------------------------------------------------------------- μενού μέσα στο VR
let vrControlsShown = false;
/** Μόνο διαδρομές του ίδιου ιστοτόπου (ποτέ άλλο domain). */
function safePath(p) { p = String(p || '/'); return p.startsWith('/') && !p.startsWith('//') && !p.startsWith('/\\') ? p : '/'; }
/** Ο ιστότοπος σε VR → το 3D παιχνίδι: απαλό σβήσιμο, ίδια συνεδρία VR, καμία νέα καρτέλα. */
async function vrGoGame() { await g.fadeTo(1, 0.45); g.vrSite.hide(); vrViewpoint(); vrPage('main'); g.audio.play('../../audio/sfx/swell.mp3', { vol: 0.5 }); await g.fadeTo(0, 0.8); }
async function vrGoSite(path) { await g.fadeTo(1, 0.4); g.vrMenu.close(); vrViewpoint(); await g.vrSite.show(path); g.fadeTo(0, 0.7); }
function vrViewpoint() { const x = 24, z = 58; g.teleport(x, z); g.rig.rotation.y = Math.atan2(x - 0, z + 24); g.locked = true; }
export function vrPage(name) {
  const save = store.get('save', null), max = qs.get('all') != null ? 99 : store.get('max', 0), M = g.vrMenu;
  const pages = {
    main: { badge: '🥽 VR', title: 'Τα Χριστούγεννα του Κιμωλάκη', sub: 'ΜΙΑ ΠΕΡΙΠΕΤΕΙΑ ΣΕ 3D', buttons: [
      ...(save?.ch ? [{ label: 'Συνέχεια', sub: `Κεφάλαιο ${save.ch + 1}: ${CHAPTERS[save.ch].title}`, primary: true, fn: () => vrStart(save.ch) }] : []),
      { label: 'Νέο παιχνίδι', sub: '7 κεφάλαια · περίπου 30 λεπτά', primary: !save?.ch, fn: () => vrPage('gender') },
      { label: 'Κεφάλαια', fn: () => vrPage('chapters') }, { label: 'Χειρισμός VR', fn: () => vrPage('controls') },
      { label: '🌐 Ο ιστότοπος σε VR', sub: 'Άρθρα, τεύχη, παιχνίδια και οδηγοί', fn: () => vrGoSite() },
      { label: 'Έξοδος από το VR', fn: () => g.vr.session?.end() }], foot: 'Σημάδεψε με το χειριστήριο και πάτα τη σκανδάλη' },
    gender: { title: 'Ποιος είσαι;', sub: 'Διάλεξε πώς θα σου μιλάνε οι χαρακτήρες', buttons: [
      { label: 'Αγόρι', primary: true, fn: () => { g.gender = 'm'; store.set('gender', 'm'); g.setPlayerLook('m'); store.set('save', { ch: 0 }); g.state = { gifts: 0 }; vrStart(0); } },
      { label: 'Κορίτσι', primary: true, fn: () => { g.gender = 'f'; store.set('gender', 'f'); g.setPlayerLook('f'); store.set('save', { ch: 0 }); g.state = { gifts: 0 }; vrStart(0); } },
      { label: '← Πίσω', fn: () => vrPage('main') }] },
    chapters: { title: 'Κεφάλαια', buttons: [...CHAPTERS.map((c, i) => ({ label: i > max ? `${c.n}. 🔒 Κλειδωμένο` : `${c.n}. ${c.title}`, disabled: i > max, fn: () => vrStart(i) })), { label: '← Πίσω', fn: () => vrPage(playing ? 'pause' : 'main') }] },
    controls: { title: 'Χειρισμός VR', text: VR_CONTROLS, buttons: [{ label: '← Πίσω', fn: () => vrPage(playing ? 'pause' : 'main') }] },
    start: { title: 'Χειρισμός VR', sub: 'Διάβασέ τα πριν ξεκινήσεις!', text: VR_CONTROLS, buttons: [{ label: 'Ξεκινάμε! 🎄', primary: true, fn: () => { M.close(); vrPending?.(); } }] },
    pause: { title: 'Παύση', buttons: [
      { label: 'Συνέχεια', primary: true, fn: () => { M.close(); g.paused = false; g.audio.musicVol(0.4); } },
      { label: 'Χειρισμός VR', fn: () => vrPage('controls') },
      { label: 'Έξοδος στο αρχικό μενού', sub: 'Η πρόοδος σώζεται στην αρχή κάθε κεφαλαίου', fn: () => location.reload() }] },
    end: { badge: 'ΤΕΛΟΣ', title: 'Καλά Χριστούγεννα!', sub: 'Βοήθησες τον Κιμωλάκη να σώσει τα Χριστούγεννα', buttons: [
      { label: 'Κεφάλαια', primary: true, fn: () => vrPage('chapters') }, { label: 'Αρχικό μενού', fn: () => vrPage('main') }, { label: '🌐 Ο ιστότοπος σε VR', fn: () => vrGoSite() }, { label: 'Έξοδος από το VR', fn: () => g.vr.session?.end() }] },
  };
  M.show(pages[name]);
}
let vrPending = null;
function vrStart(ch) {
  if (!vrControlsShown) { vrControlsShown = true; vrPending = () => { vrPending = null; start(ch); }; vrPage('start'); return; }
  g.vrMenu.close(); start(ch);
}
function vrPause() { if (!playing) return; g.paused = true; g.audio.musicVol(0.08); vrPage('pause'); }
function alertBox(t) { const a = $('#alert'); a.querySelector('p').textContent = t; a.hidden = false; }

// ---------------------------------------------------------------- κουμπιά
$('#mNew').addEventListener('click', () => showMenu(true, 'gender'));
document.querySelectorAll('[data-gender]').forEach((b) => b.addEventListener('click', () => { g.gender = b.dataset.gender; store.set('gender', g.gender); g.setPlayerLook(g.gender); if (b.closest('[data-p="gender"]')) { store.set('save', { ch: 0 }); g.state = { gifts: 0 }; start(0); } else renderMenu(); }));
$('#mContinue').addEventListener('click', () => start());
document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => showMenu(true, b.dataset.go)));
$('#sQuality').addEventListener('change', (e) => { store.set('quality', e.target.value); location.reload(); });
$('#sSens').addEventListener('input', (e) => { g.input.sens = Number(e.target.value); localStorage.setItem('kimo3d:sens', e.target.value); });
$('#sMusic').addEventListener('input', (e) => g.audio.setVol('music', Number(e.target.value)));
$('#sSfx').addEventListener('input', (e) => g.audio.setVol('sfx', Number(e.target.value)));
$('#sVoice').addEventListener('input', (e) => g.audio.setVol('voice', Number(e.target.value)));
$('#sTut').addEventListener('change', (e) => { g.settings.tutorials = e.target.value === '1'; localStorage.setItem('kimo3d:tut', e.target.value); });
$('#sCam').addEventListener('change', (e) => { g.camMode = e.target.value; store.set('cam', e.target.value); });
$('#vrYes').addEventListener('click', () => {
  wantVR = true; $('#vrPrompt').hidden = true; $('#vrBadge').classList.add('on'); $('#vrBadge').textContent = '🥽 Λειτουργία VR: ΝΑΙ';
  // μπαίνουμε στο VR αμέσως (ο browser θα ζητήσει άδεια) και όλο το μενού συνεχίζει ΜΕΣΑ στο VR
  g.enterVR().then(() => { showMenu(false); vrViewpoint(); vrPage('main'); }).catch((e) => { wantVR = false; alertBox('Δεν ξεκίνησε το VR. Αν ο browser ρώτησε για άδεια, πάτα «Allow / Να επιτρέπεται» και δοκίμασε ξανά. (' + (e.message || e) + ')'); });
});
$('#vrNo').addEventListener('click', () => { wantVR = false; $('#vrPrompt').hidden = true; });
$('#vrBadge').addEventListener('click', () => showVRPrompt());
$('#pResume').addEventListener('click', () => togglePause(false));
$('#pMenu').addEventListener('click', () => location.reload());
$('#pSettings').addEventListener('click', () => { $('#pause').hidden = true; showMenu(true, 'settings'); $('#menu').classList.add('over'); });
$('#alert button').addEventListener('click', () => { $('#alert').hidden = true; });
document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => { if (playing) { showMenu(false); $('#menu').classList.remove('over'); togglePause(true); } else showMenu(true, 'main'); }));
const cam = store.get('cam', null);
window.__vrPage = (n) => vrPage(n);
boot().then(() => { if (cam) g.camMode = cam; }).catch((e) => { $('#load b').textContent = 'Κάτι πήγε στραβά: ' + e.message; console.error(e); });

// είσοδος από τον ιστότοπο («Ναι, σε VR»): ο browser θέλει ένα πάτημα πριν ανοίξει το VR
document.querySelector('#vrEnterGo')?.addEventListener('click', () => {
  $('#vrEnter').hidden = true; wantVR = true;
  g.enterVR().then(() => { showMenu(false); vrViewpoint(); g.vrSite.show(safePath(qs.get('from'))); })
    .catch(() => { $('#vrEnter').hidden = false; alertBox('Δεν ξεκίνησε το VR. Αν ο browser ρώτησε για άδεια, πάτα «Allow» / «Να επιτρέπεται» και δοκίμασε ξανά.'); });
});
document.querySelector('#vrEnterNo')?.addEventListener('click', () => { location.href = safePath(qs.get('from')); });
document.querySelector('#backSite')?.addEventListener('click', (e) => { e.preventDefault(); document.body.classList.add('leaving'); setTimeout(() => { location.href = '/'; }, 320); });
