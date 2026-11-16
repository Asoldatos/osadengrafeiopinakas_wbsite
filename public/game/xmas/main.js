// Εκκίνηση: φόρτωση, μενού, ανίχνευση VR, ρυθμίσεις, παύση, πλήρης οθόνη στα κινητά.
import { THREE, DEVICE, VR, defaultQuality } from './engine.js';
import { Game } from './game.js';
import { CHAPTERS, play } from './story.js';
import { height, P } from './world.js';

const $ = (s) => document.querySelector(s), app = $('#app');
const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem('kimo3d:' + k)) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem('kimo3d:' + k, JSON.stringify(v)); } catch {} } };
const qs = new URLSearchParams(location.search);
const qName = qs.get('q') || store.get('quality', defaultQuality());
let g, wantVR = false, playing = false;

async function boot() {
  $('#load b').textContent = 'Χτίζεται ο χιονισμένος κόσμος…';
  await new Promise((r) => setTimeout(r, 30));
  g = window.__game = new Game(app, qName);
  g.gender = store.get('gender', 'm');
  // φόρτωση ήχων στο παρασκήνιο (δεν χρειάζεται «άδεια» για αποκωδικοποίηση)
  for (const u of ['../../audio/christmas-music.mp3', '../../audio/sfx/pop.mp3', '../../audio/sfx/click.mp3', '../../audio/christmas-sfx.mp3', '../../audio/sfx/swell.mp3']) g.audio.load(u);
  menuCamera(); g.fadeTo(0, 1.4);
  $('#load').classList.add('out'); setTimeout(() => $('#load').remove(), 700);
  renderMenu(); showMenu(true);
  if (await VR.supported()) { $('#vrBadge').hidden = false; if (!store.get('vrAsked', false) || DEVICE.quest) showVRPrompt(); }
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
  $('#sQuality').value = qName; $('#sSens').value = g.input.sens; $('#sMusic').value = g.audio.vol.music; $('#sSfx').value = g.audio.vol.sfx; $('#sCam').value = g.camMode;
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
  let vrStart = null; if (wantVR) vrStart = g.enterVR().catch((e) => { alertBox('Δεν ξεκίνησε το VR: ' + (e.message || e)); wantVR = false; });
  let fs = null; if (DEVICE.touch && !wantVR) fs = document.documentElement.requestFullscreen?.({ navigationUI: 'hide' })?.then(() => screen.orientation?.lock?.('landscape')).catch(() => {});
  showMenu(false); $('#tipDesktop').hidden = $('#tipMobile').hidden = true; $('#pause').hidden = true;
  await g.audio.unlock();
  if (DEVICE.touch && !wantVR) { await fs; if (!g.input.touchEl) g.input.buildTouch(app); g.input.touchEl.hidden = false; }
  if (vrStart) await vrStart;
  else if (!DEVICE.touch) g.input.lock();
  playing = true; g.locked = false; g.cine = null; g.tick = null; g.paused = false; g.kid.root.visible = !g.inVR; document.body.classList.add('playing');
  await g.fadeTo(1, 0.5);
  await play(g, ch, (i) => { store.set('save', { ch: i }); store.set('max', Math.max(store.get('max', 0), i)); });
  // τέλος
  playing = false; document.body.classList.remove('playing'); store.set('max', CHAPTERS.length - 1); if (document.pointerLockElement) document.exitPointerLock();
  if (g.inVR) await g.vr.session.end().catch(() => {});
  g.reset(); menuCamera(); await g.fadeTo(0, 1.5); renderMenu(); showMenu(true, 'end');
}
function togglePause(on) {
  if (!playing) return; g.paused = on; $('#pause').hidden = !on; g.audio.musicVol(on ? 0.08 : (g.audio.music ? 0.4 : 0));
  if (!on && !DEVICE.touch) g.input.lock();
}
function alertBox(t) { const a = $('#alert'); a.querySelector('p').textContent = t; a.hidden = false; }

// ---------------------------------------------------------------- κουμπιά
$('#mNew').addEventListener('click', () => showMenu(true, 'gender'));
document.querySelectorAll('[data-gender]').forEach((b) => b.addEventListener('click', () => { g.gender = b.dataset.gender; store.set('gender', g.gender); if (b.closest('[data-p="gender"]')) { store.set('save', { ch: 0 }); g.state = { gifts: 0 }; start(0); } else renderMenu(); }));
$('#mContinue').addEventListener('click', () => start());
document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => showMenu(true, b.dataset.go)));
$('#sQuality').addEventListener('change', (e) => { store.set('quality', e.target.value); location.reload(); });
$('#sSens').addEventListener('input', (e) => { g.input.sens = Number(e.target.value); localStorage.setItem('kimo3d:sens', e.target.value); });
$('#sMusic').addEventListener('input', (e) => g.audio.setVol('music', Number(e.target.value)));
$('#sSfx').addEventListener('input', (e) => g.audio.setVol('sfx', Number(e.target.value)));
$('#sCam').addEventListener('change', (e) => { g.camMode = e.target.value; store.set('cam', e.target.value); });
$('#vrYes').addEventListener('click', () => { wantVR = true; $('#vrPrompt').hidden = true; $('#vrBadge').classList.add('on'); $('#vrBadge').textContent = '🥽 Λειτουργία VR: ΝΑΙ'; });
$('#vrNo').addEventListener('click', () => { wantVR = false; $('#vrPrompt').hidden = true; });
$('#vrBadge').addEventListener('click', () => showVRPrompt());
$('#pResume').addEventListener('click', () => togglePause(false));
$('#pMenu').addEventListener('click', () => location.reload());
$('#pSettings').addEventListener('click', () => { $('#pause').hidden = true; showMenu(true, 'settings'); $('#menu').classList.add('over'); });
$('#alert button').addEventListener('click', () => { $('#alert').hidden = true; });
document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => { if (playing) { showMenu(false); $('#menu').classList.remove('over'); togglePause(true); } else showMenu(true, 'main'); }));
const cam = store.get('cam', null);
boot().then(() => { if (cam) g.camMode = cam; }).catch((e) => { $('#load b').textContent = 'Κάτι πήγε στραβά: ' + e.message; console.error(e); });
