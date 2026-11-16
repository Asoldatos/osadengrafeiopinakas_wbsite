// Η ιστορία: 7 κεφάλαια. Κάθε κεφάλαιο είναι μια async συνάρτηση που στήνει τη σκηνή, δίνει στόχους και περιμένει τον παίκτη.
import { THREE, glowTex, canvasTex, signTex, rand, clamp, lerp, DEVICE } from './engine.js';
import { height, P, LAKE_Y, pathX } from './world.js';
import { makeKid, makeKimolakis, makeReindeer, makeSleigh, makeGift, makeSnowman, makeBeacon } from './actors.js';
import { tutorial, closeTutorial, tutMark } from './tutorial.js';

const MUSIC = '../../audio/christmas-music.mp3', LS = 2269665 / 44100, LE = 4386904 / 44100;
const K = (t) => ({ who: 'Εσύ', c: 'k', text: t }), MA = (t) => ({ who: 'Μαρία', c: 'm', text: t }), NI = (t) => ({ who: 'Νίκος', c: 'n', text: t }), KI = (t) => ({ who: 'Κιμωλάκης', c: 's', text: t }), EL = (t) => ({ who: 'Κυρία Ελένη', c: 'e', text: t }), N = (t) => ({ who: '', text: t }), MO = (t) => ({ who: '', c: 'mom', text: t });

export const CHAPTERS = [
  { n: 1, title: 'Χιονισμένο πρωινό', run: ch1 },
  { n: 2, title: 'Ο δρόμος για το σχολείο', run: ch2 },
  { n: 3, title: 'Η μεγάλη μέρα στο πάρκο', run: ch3 },
  { n: 4, title: 'Τα ίχνη από κιμωλία', run: ch4 },
  { n: 5, title: 'Το δάσος τη νύχτα', run: ch5 },
  { n: 6, title: 'Η πτήση του έλκηθρου', run: ch6 },
  { n: 7, title: 'Χριστούγεννα!', run: ch7 },
];

/** Ξεκινά από το κεφάλαιο i και συνεχίζει μέχρι το τέλος. */
export async function play(g, i, onSave) {
  g.state ||= { gifts: 0 };
  for (; i < CHAPTERS.length; i++) {
    onSave?.(i); g.reset(); const c = CHAPTERS[i];
    await c.run(g, c);
  }
  onSave?.(0);
}
function item(g, mesh, x, y, z, label, r = 1.8) { mesh.position.set(x, y, z); g.keep(mesh); const it = g.addInter({ pos: { x, z }, r, label }); it.mesh = mesh; return it; }
const pickup = (g, it) => { g.removeInter(it); g.scene.remove(it.mesh); g.audio.chime([1047, 1319], 0.08, 0.15); };
const near = (g, p, r) => Math.hypot(g.p.pos.x - p.x, g.p.pos.z - p.z) < r;
const glowSprite = (color, s = 1) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(color), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); sp.scale.set(s, s, 1); return sp; };
const confetti = (g, at, n = 60) => { for (let i = 0; i < 4; i++) setTimeout(() => g.splat.burst(new THREE.Vector3(at.x + rand(-1, 1), at.y + 1.5 + rand(0, 1), at.z + rand(-1, 1)), n / 4, 5), i * 120); g.audio.chime([784, 988, 1175, 1568, 2093], 0.08, 0.18); };

// =================================================================== 1. Χιονισμένο πρωινό
async function ch1(g, c) {
  const I = P.interior, X = I.x, Z = I.z;
  g.world.setIndoor(true); g.world.setTime('morning', 0.01); g.audio.setWind(0.15); g.audio.stopMusic(0.5);
  g.teleport(X - 3.2, Z + 2.6, -Math.PI / 2); g.p.pitch = 0.05;
  await g.fadeTo(1, 0.01); g.ui.chapter(c.n, c.title); await g.wait(0.8); await g.fadeTo(0, 2.2);
  // ξυπνητήρι
  const clock = new THREE.Group(); clock.add(new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.14), new THREE.MeshStandardMaterial({ color: 0xc8102e })));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.13), new THREE.MeshBasicMaterial({ map: canvasTex(128, 64, (x) => { x.fillStyle = '#100'; x.fillRect(0, 0, 128, 64); x.fillStyle = '#ff3030'; x.font = 'bold 44px monospace'; x.fillText('07:00', 4, 48); }) }));
  face.position.set(0, 0, 0.071); clock.add(face); for (const sx of [-1, 1]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshStandardMaterial({ color: 0xf6c453, metalness: 0.8, roughness: 0.3 })); b.position.set(sx * 0.1, 0.13, 0); clock.add(b); }
  clock.rotation.y = -0.4; const ci = item(g, clock, X - 2.8, 0.82, Z + 4.25, 'Κλείσε το ξυπνητήρι', 2.2);
  let ringing = true; g.tick = (dt, t) => { if (ringing && Math.floor(t * 4) !== Math.floor((t - dt) * 4) && Math.floor(t * 4) % 4 < 3) g.audio.bell(2093, 0.12); if (ringing) clock.position.x = X - 2.8 + Math.sin(t * 70) * 0.01; };
  await g.say([N('Δευτέρα, 22 Δεκεμβρίου. 07:00. Η τελευταία μέρα σχολείου πριν από τις γιορτές.'), K('Μμμ… πέντε λεπτά ακόμα…'), N('ΝΤΡΙΝ! ΝΤΡΙΝ! ΝΤΡΙΝ!'), K('Εντάξει, εντάξει! Ξύπνησα!')]);
  tutorial(g, 'move').then(() => tutorial(g, 'act'));
  g.ui.objective('Κλείσε το ξυπνητήρι'); g.setBeacon({ x: X - 2.8, z: Z + 4.25, y: 0 });
  await new Promise((r) => { ci.fn = () => { ringing = false; g.audio.play('../../audio/sfx/click.mp3', { vol: 0.6 }); g.removeInter(ci); r(); }; });
  g.setBeacon(null); g.tick = null;
  await g.say([K('Αααχ, ησυχία.'), K('Περίεργο… γιατί είναι τόσο φωτεινά έξω; Και τόσο… ήσυχα;')]);
  // παράθυρο
  g.ui.objective('Κοίτα έξω από το παράθυρο'); g.setBeacon({ x: X + 5.2, z: Z + 2.2, y: 0 });
  const wi = g.addInter({ pos: { x: X + 5.2, z: Z + 2.2 }, r: 2, label: 'Κοίτα έξω' });
  await new Promise((r) => { wi.fn = () => { g.removeInter(wi); r(); }; }); g.setBeacon(null);
  g.locked = true; g.p.yaw = -Math.PI / 2; g.p.pitch = 0.05;
  await g.say([K('ΟΥΑΟΥ!'), K('ΧΙΟΝΙΖΕΙ! Όλα είναι κάτασπρα! Οι στέγες, οι δρόμοι, τα δέντρα…'), K('Μια στιγμή… Το γράμμα μου!'), N('Χθες το βράδυ είχες γράψει ένα γράμμα στον Άγιο Βασίλη:'), N('«Φέτος δεν θέλω δώρο. Θέλω μόνο να χιονίσει πολύ, για να παίξουμε ΟΛΟΙ μαζί.»'), N('«Υ.Γ. Πες ένα γεια στον Κιμωλάκη, την κιμωλία της τάξης μας. Νομίζω ότι την Παρασκευή μού έκλεισε το μάτι.»'), K('Η ευχή μου έπιασε;! Λες να κλείσουν και τα σχολεία; Πρέπει να το μάθω ΑΜΕΣΩΣ!')]);
  g.locked = false;
  // ντύσιμο
  const things = [
    ['Σκούφος', X + 4.8, 1.0, Z + 0.4, () => { const m = new THREE.Group(); const h = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10, 0, 6.3, 0, 1.7), new THREE.MeshStandardMaterial({ color: 0xc8102e })); const p = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffffff })); p.position.y = 0.16; m.add(h, p); return m; }],
    ['Κασκόλ', X - 1.2, 0.05, Z + 1.6, () => new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.06, 8, 20), new THREE.MeshStandardMaterial({ color: 0xf6c453 }))],
    ['Γάντια', X - 4.6, 0.9, Z + 2.0, () => { const m = new THREE.Group(); for (const sx of [-1, 1]) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), new THREE.MeshStandardMaterial({ color: 0xf6c453 })); s.scale.set(1, 0.6, 1.4); s.position.x = sx * 0.12; m.add(s); } return m; }],
    ['Τσάντα', X + 3.4, 0.25, Z - 1.6, () => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 0.2), new THREE.MeshStandardMaterial({ color: 0xe8573d })); return m; }],
  ];
  let got = 0; g.ui.objective('Ετοιμάσου για έξω', `0/${things.length}`);
  await new Promise((done) => things.forEach(([name, x, y, z, mk]) => { const m = mk(); m.rotation.x = name === 'Κασκόλ' ? Math.PI / 2 : 0; const it = item(g, m, x, y, z, `Πάρε: ${name}`); it.fn = () => { pickup(g, it); got++; g.ui.progress(`${got}/${things.length}`); g.ui.toast(`Βρήκες: ${name}!`); if (got === things.length) done(); }; }));
  await g.say([K('Σκούφος, κασκόλ, γάντια, τσάντα. {Έτοιμος|Έτοιμη} για όλα!'), K('Αλλά πρώτα… πρωινό. Πάμε στην κουζίνα.')]);
  // κουζίνα
  const note = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.5), new THREE.MeshStandardMaterial({ map: signTex(['Καλημέρα!', 'Φύγαμε νωρίς', 'Φάε πρωινό ♥'], { w: 256, h: 300, bg: '#fff59a', fg: '#333', font: 'bold 34px system-ui', border: '#f0d24a' }) }));
  note.position.set(X + 4.48, 1.45, Z - 9.99); note.rotation.y = 0; g.keep(note);
  const milk = new THREE.Group(); const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.16, 14), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })); glass.position.set(0.15, 0.08, 0); milk.add(glass);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 20), new THREE.MeshStandardMaterial({ color: 0xffffff })); milk.add(plate); for (let i = 0; i < 4; i++) { const ck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 12), new THREE.MeshStandardMaterial({ color: 0xc48a4a })); ck.position.set(Math.cos(i * 1.6) * 0.08, 0.02 + i * 0.012, Math.sin(i * 1.6) * 0.08); milk.add(ck); }
  g.ui.objective('Διάβασε το σημείωμα στο ψυγείο'); g.setBeacon({ x: X + 4.5, z: Z - 9.6, y: 0 });
  const ni = g.addInter({ pos: { x: X + 4.5, z: Z - 9.4 }, r: 2, label: 'Διάβασε το σημείωμα' });
  await new Promise((r) => { ni.fn = () => { g.removeInter(ni); r(); }; });
  await g.say([MO('«Καλημέρα, αγάπη μου! Φύγαμε νωρίς για τη δουλειά λόγω του χιονιού.'), MO('Το γάλα και τα μπισκότα είναι στο τραπέζι. Ντύσου ΖΕΣΤΑ! Φιλιά, η μαμά ♥»'), K('Μπισκότα!!!')]);
  const mi = item(g, milk, X - 2, 0.9, Z - 7, 'Φάε πρωινό', 2.2); g.setBeacon({ x: X - 2, z: Z - 7, y: 0 }); g.ui.objective('Φάε πρωινό');
  await new Promise((r) => { mi.fn = () => { pickup(g, mi); for (let i = 0; i < 3; i++) setTimeout(() => g.audio.crunch(0.4), i * 260); r(); }; });
  await g.say([K('Μμμ! Τα καλύτερα μπισκότα του κόσμου!'), K('Και τώρα… ΕΞΩ!')]);
  g.ui.objective('Βγες από το σπίτι'); g.setBeacon({ x: X - 4.6, z: Z - 10.2, y: 0 });
  const di = g.addInter({ pos: { x: X - 4.6, z: Z - 10.2 }, r: 1.8, label: 'Άνοιξε την πόρτα' });
  await new Promise((r) => { di.fn = () => { g.removeInter(di); r(); }; });
  g.audio.play('../../audio/sfx/click.mp3', { vol: 0.6, rate: 0.6 }); await g.fadeTo(1, 0.8);
  g.world.setIndoor(false); g.setBeacon(null); g.ui.objective('');
}

// =================================================================== 2. Ο δρόμος για το σχολείο
async function ch2(g, c) {
  g.world.setIndoor(false); g.world.setTime('morning', 0.01); g.world.setTime('day', 90);
  const d = g.world.homeDoorPos || [P.homeDoor.x, 0, P.homeDoor.z]; g.teleport(d[0] - 0.5, d[2], Math.PI / 2); g.p.pitch = -0.1;
  g.kid.root.visible = !g.inVR; await g.fadeTo(0, 1.6); g.ui.chapter(c.n, c.title);
  g.audio.musicLoop(MUSIC, LS, LE, 0.32);
  await g.say([K('Τι ωραία που τρίζει το χιόνι κάτω από τα πόδια μου!'), K('Το σχολείο είναι στο τέλος του δρόμου. Πάμε!')]);
  tutorial(g, 'run');
  const eleni = g.addNPC(makeKid({ coat: 0x6a2b3b, hat: 0x3a2a4a, scarf: 0xf6c453, hair: 0x3a2416, pants: 0x2a2a3a, girl: true, height: 1.32 }), 3.4, P.gate.z + 2.6, 0); eleni.voice = 'e'; eleni.look = 'player';
  g.ui.objective('Πήγαινε στο σχολείο'); g.setBeacon({ x: 0, z: P.gate.z + 3 });
  // η Μαρία περιμένει στη γωνία
  const maria = g.addNPC(makeKid({ coat: 0xff6aa8, girl: true, hat: 0x9b2cff, scarf: 0xffffff, hair: 0x2a1a10, backpack: true }), -3, 14, Math.PI); maria.voice = 'm'; maria.look = 'player';
  let wave = 0; g.tick = (dt) => { if ((wave -= dt) < 0 && !near(g, maria.pos, 6)) { wave = 2.5; maria.a.st.wave = 1.2; } };
  await g.until(() => near(g, maria.pos, 6) || g.p.pos.z < 9);
  g.tick = null;
  if (!near(g, maria.pos, 6)) { maria.speed = 6; maria.follow = () => g.p.pos; maria.followDist = 2.5; g.say([MA('Ε! ΕΕΕ! Περίμενέ με!')]); await g.until(() => near(g, maria.pos, 3.5)); maria.follow = null; }
  await g.say([MA('Καλημέρα! Είδες τι χιόνι έριξε;! Μοιάζει σαν να μας σκέπασε ένα τεράστιο πάπλωμα!'), K('Καλημέρα, Μαρία! Λες να έχουμε σχολείο σήμερα;'), MA('Ξέρεις τι διάβασα; Κάθε νιφάδα έχει έξι μύτες, και δεν υπάρχουν δύο ίδιες σε όλο τον κόσμο!'), MA('Άρα σήμερα έπεσαν… τρισεκατομμύρια διαφορετικές νιφάδες. Δεν μπορεί να έχουμε σχολείο. Πάμε να δούμε!')]);
  maria.follow = () => g.p.pos; maria.followDist = 2;
  // στη μέση της διαδρομής: χιονάγγελος
  await g.until(() => g.p.pos.z < -10);
  await g.say([MA('Κοίτα! Ο δρόμος δεν έχει ούτε ένα αυτοκίνητο. Όλη η πόλη κοιμάται κάτω από το χιόνι.'), K('Είναι σαν να είναι όλα δικά μας σήμερα!')]);
  await g.until(() => near(g, P.gate, 7));
  g.locked = true; g.setBeacon(null); maria.follow = null; maria.target = { x: -1.6, z: P.gate.z + 2.2 }; maria.onArrive = () => { maria.look = 'player'; };
  g.cine = { pos: new THREE.Vector3(1.5, 2.4, P.gate.z + 5), look: new THREE.Vector3(0, 1.1, P.gate.z) };
  await g.say([K('Περίμενε, τι γράφει εκεί;'), N('«ΚΛΕΙΣΤΟ ΣΗΜΕΡΑ λόγω χιονόπτωσης»'), EL('Καλημέρα, παιδιά! Ναι, καλά διαβάσατε. Σήμερα το σχολείο είναι κλειστό.'), MA('…'), K('…'), MA('ΔΕΝ ΕΧΟΥΜΕ ΣΧΟΛΕΙΟ!!!')]);
  maria.a.st.cheer = 2.5; g.kid.st.cheer = 2.5; confetti(g, { x: 0, y: height(0, P.gate.z + 2), z: P.gate.z + 2 });
  await g.wait(1.2);
  await g.say([EL('Χα χα! Πριν τρέξετε, μια ερώτηση: μήπως πήρε κανείς σας τις κιμωλίες της τάξης;'), EL('Ήρθα το πρωί να ποτίσω τα λουλούδια και… είχαν εξαφανιστεί ΟΛΕΣ.'), EL('Και στον πίνακα κάποιος είχε ζωγραφίσει ένα έλκηθρο με τρεις τάρανδους. Πολύ όμορφο, πάντως.'), MA('Εμείς; Όχι, κυρία!'), K('(Ένα έλκηθρο… ζωγραφισμένο με κιμωλία; Περίεργο…)'), EL('Καλά, καλά. Να περάσετε υπέροχα, και ντυθείτε ζεστά!')]);
  eleni.look = null; eleni.speed = 2.4; eleni.target = { x: -22, z: P.gate.z + 12 }; eleni.onArrive = () => g.removeNPC(eleni);
  g.cine = null; g.locked = false;
  // ο Νίκος έρχεται τρέχοντας
  const nikos = g.addNPC(makeKid({ coat: 0x0f7b4b, hat: 0xf6c453, scarf: 0xc8102e, hair: 0xd9a15a, backpack: true }), 0, -20, Math.PI); nikos.voice = 'n'; nikos.speed = 5.5; nikos.target = { x: 1.6, z: P.gate.z + 3 };
  await g.wait(0.8);
  await g.say([NI('Παιδιάαα! Το μάθατε;! Κλειστά ΟΛΑ τα σχολεία!'), NI('Το ήξερα! Το γόνατο της γιαγιάς μου δεν κάνει ποτέ λάθος στον καιρό!'), NI('Όλη η γειτονιά έχει μαζευτεί στο πάρκο!'), MA('Τέλεια! Θα φτιάξουμε τον μεγαλύτερο χιονάνθρωπο του κόσμου. Έχω ήδη σχέδιο!'), NI('Κι ΕΓΩ θα σας νικήσω στον χιονοπόλεμο. Όπως κάθε χρόνο.'), K('Αυτό θα το δούμε!')]);
  nikos.look = null; maria.follow = () => g.p.pos; nikos.follow = () => g.p.pos; nikos.followDist = 3.2;
  g.ui.objective('Πήγαινε στο πάρκο'); g.setBeacon({ x: P.park.x - 4, z: P.park.z + 4 });
  await g.until(() => near(g, { x: P.park.x - 4, z: P.park.z + 4 }, 9));
  g.setBeacon(null); g.state.friends = { maria, nikos };
}

// =================================================================== 3. Η μεγάλη μέρα στο πάρκο
async function ch3(g, c) {
  g.world.setIndoor(false); g.world.setTime('day', 0.01); g.audio.musicLoop(MUSIC, LS, LE, 0.3);
  let maria = g.npcs.find((n) => n === g.state.friends?.maria), nikos = g.npcs.find((n) => n === g.state.friends?.nikos);
  if (!maria) { g.teleport(P.park.x - 6, P.park.z + 8, 0.6); maria = g.addNPC(makeKid({ coat: 0xff6aa8, girl: true, hat: 0x9b2cff, scarf: 0xffffff, hair: 0x2a1a10, backpack: true }), P.park.x - 4, P.park.z + 6); maria.voice = 'm'; nikos = g.addNPC(makeKid({ coat: 0x0f7b4b, hat: 0xf6c453, scarf: 0xc8102e, hair: 0xd9a15a, backpack: true }), P.park.x - 8, P.park.z + 5); nikos.voice = 'n'; await g.fadeTo(0, 1); }
  g.ui.chapter(c.n, c.title);
  maria.follow = nikos.follow = null; maria.target = { x: P.snowman.x + 3, z: P.snowman.z + 2 }; nikos.target = { x: P.snowman.x - 3, z: P.snowman.z + 2.5 }; maria.onArrive = nikos.onArrive = function () { this.look = 'player'; };
  maria.onArrive = () => { maria.look = 'player'; }; nikos.onArrive = () => { nikos.look = 'player'; };
  await g.say([NI('Οι κανόνες του χιονάνθρωπου: ΤΡΕΙΣ μπάλες. Μια μεγάλη, μια μεσαία και μια μικρή για κεφάλι.'), MA('Κύλα μια μπάλα χιονιού πάνω στο χιόνι — όσο την κυλάς, τόσο μεγαλώνει!'), MA('Όταν είναι αρκετά μεγάλη, φέρ\' τη μέσα στον μπλε κύκλο.')]);
  // ---- κύλισμα χιονόμπαλας
  const sm = makeSnowman(); sm.g.position.set(P.snowman.x, height(P.snowman.x, P.snowman.z), P.snowman.z); g.keep(sm.g);
  const stages = [['base', 0.75, 'Μεγάλη μπάλα (βάση)'], ['mid', 0.55, 'Μεσαία μπάλα (σώμα)'], ['head', 0.38, 'Μικρή μπάλα (κεφάλι)']];
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xf6f9ff, roughness: 1 });
  for (const [part, target, label] of stages) {
    g.ui.objective(`Κύλησε μια χιονόμπαλα: ${label}`, 'Περπάτα σπρώχνοντάς τη'); if (part === 'base') tutorial(g, 'roll');
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16), snowMat); ball.castShadow = true; g.keep(ball);
    let r = 0.15, placed = false, ready = false; const bp = new THREE.Vector3(g.p.pos.x + 1.2, 0, g.p.pos.z); const fw = () => new THREE.Vector3(Math.sin(g.kid.root.rotation.y), 0, Math.cos(g.kid.root.rotation.y));
    g.setBeacon(null);
    g.tick = (dt) => {
      // η μπάλα μένει μπροστά σου και κυλάει
      const f = fw(), want = new THREE.Vector3(g.p.pos.x, 0, g.p.pos.z).addScaledVector(f, 0.55 + r); const mv = Math.hypot(want.x - bp.x, want.z - bp.z);
      bp.x = lerp(bp.x, want.x, Math.min(1, dt * 8)); bp.z = lerp(bp.z, want.z, Math.min(1, dt * 8));
      if (mv > 0.01) tutMark(g, 'roll', dt / 3); if (!ready) { r = Math.min(target, r + mv * 0.022 * (g.onIce ? 0 : 1)); if (r >= target) { ready = true; g.audio.chime([988, 1319], 0.08, 0.15); g.ui.toast('Τέλεια! Φέρ\' τη στον μπλε κύκλο.'); g.setBeacon({ x: P.snowman.x, z: P.snowman.z }); } }
      g.ui.progress(ready ? 'Πήγαινέ τη στον κύκλο' : `Μέγεθος: ${Math.round((r / target) * 100)}%`);
      ball.scale.setScalar(r); ball.position.set(bp.x, height(bp.x, bp.z) + r * 0.92, bp.z); ball.rotation.x += mv * 2 / Math.max(r, 0.1);
      if (mv > 0.004 && Math.random() < 0.3) g.splat.burst(new THREE.Vector3(bp.x, height(bp.x, bp.z) + 0.05, bp.z), 2, 1);
      if (ready && Math.hypot(bp.x - P.snowman.x, bp.z - P.snowman.z) < 2.2) placed = true;
    };
    await g.until(() => placed);
    g.tick = null; g.scene.remove(ball); sm.show(part); g.audio.splat(0.5); g.splat.burst(new THREE.Vector3(P.snowman.x, height(P.snowman.x, P.snowman.z) + 1.5, P.snowman.z), 30, 3);
    await g.say([part === 'base' ? NI('Τι βάση! Σαν βράχος!') : part === 'mid' ? MA('Γίνεται ψηλότερος από μένα!') : K('Έχει κεφάλι! Του λείπει όμως… πρόσωπο.')]);
  }
  g.world.snowmanRing.visible = false; g.setBeacon(null);
  // ---- στολίδια
  await g.say([MA('Χρειάζεται καρότο για μύτη, ένα καπέλο και δύο κλαδιά για χέρια!'), NI('Ο κύριος Σταύρος στον πάγκο λαχανικών αφήνει πάντα καρότα για τους χιονάνθρωπους.')]);
  const carrot = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.4, 10), new THREE.MeshStandardMaterial({ color: 0xff7b1c })); carrot.rotation.z = Math.PI / 2;
  const hat = new THREE.Group(); hat.add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 16), new THREE.MeshStandardMaterial({ color: 0x151515 }))); const top = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.21, 0.32, 16), new THREE.MeshStandardMaterial({ color: 0x151515 })); top.position.y = 0.17; hat.add(top);
  const stick = () => { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.9, 5), new THREE.MeshStandardMaterial({ color: 0x5a3520 })); s.rotation.z = Math.PI / 2; return s; };
  const S = g.world.stall, list = [
    ['Καρότο', carrot, S.x, height(S.x, S.z) + 1.08, S.z + 0.2],
    ['Καπέλο', hat, P.park.x - 12, height(P.park.x - 12, P.park.z - 2) + 0.8, P.park.z - 2],
    ['Κλαδί', stick(), P.park.x + 16, height(P.park.x + 16, P.park.z - 18) + 0.06, P.park.z - 18],
    ['Κλαδί', stick(), P.park.x - 16, height(P.park.x - 16, P.park.z + 14) + 0.06, P.park.z + 14],
  ];
  let got = 0; g.ui.objective('Βρες τα στολίδια του χιονάνθρωπου', `0/${list.length}`);
  const glows = [];
  await new Promise((done) => list.forEach(([name, m, x, y, z]) => { const sp = glowSprite('rgba(255,230,140,1)', 1.2); sp.position.set(x, y + 0.4, z); g.keep(sp); glows.push(sp); const it = item(g, m, x, y, z, `Πάρε: ${name}`, 2.2); it.fn = () => { pickup(g, it); g.scene.remove(sp); got++; g.ui.progress(`${got}/${list.length}`); g.ui.toast(`Βρήκες: ${name}!`); if (got === list.length) done(); }; }));
  g.ui.objective('Στόλισε τον χιονάνθρωπο'); g.setBeacon({ x: P.snowman.x, z: P.snowman.z });
  const si = g.addInter({ pos: { x: P.snowman.x, z: P.snowman.z }, r: 2.8, label: 'Στόλισε τον χιονάνθρωπο' });
  await new Promise((r) => { si.fn = () => { g.removeInter(si); r(); }; });
  g.setBeacon(null); sm.show('face', 'arms', 'hat'); await g.wait(0.4);
  await g.say([MA('Και… το τελευταίο άγγιγμα. Του χαρίζω το κόκκινο κασκόλ μου!')]); sm.show('scarf');
  confetti(g, { x: P.snowman.x, y: height(P.snowman.x, P.snowman.z) + 1.5, z: P.snowman.z }, 90); maria.a.st.cheer = nikos.a.st.cheer = g.kid.st.cheer = 2.5;
  await g.say([NI('Ο ΚΑΛΥΤΕΡΟΣ ΧΙΟΝΑΝΘΡΩΠΟΣ ΤΟΥ ΚΟΣΜΟΥ!'), MA('Θα τον λέμε… Κύριο Χιονούλη!'), K('Γεια σας, κύριε Χιονούλη!')]);
  g.phys.circle(P.snowman.x, P.snowman.z, 0.8);
  // ---- χιονοπόλεμος
  await g.say([NI('Και τώρα… ΧΙΟΝΟΠΟΛΕΜΟΣ! Εσύ εναντίον μας!'), MA('Όποιος πετύχει πρώτος 10 φορές, κερδίζει!'), NI('Κρύψου πίσω από τα χιονοκάστρα — αν μπορείς!')]);
  tutorial(g, 'throw', { max: 60 });
  const A = P.arena, spots = [[A.x - 6, A.z + 6], [A.x + 8, A.z - 4], [A.x + 1, A.z - 11], [A.x - 9, A.z - 6], [A.x + 9, A.z + 6]];
  let mine = 0, theirs = 0, rounds = 0;
  for (;;) {
    mine = theirs = 0; rounds++;
    g.ui.objective('Χιονοπόλεμος! Πέτυχε τους φίλους σου', `Εσύ ${mine} – ${theirs} Αυτοί`); g.canThrow = true;
    if (!near(g, A, 16)) g.setBeacon({ x: A.x, z: A.z + 2 });
    for (const [n, i] of [[maria, 0], [nikos, 1]]) { n.look = 'player'; n.next = rand(1.5, 3); n.target = { x: spots[i][0], z: spots[i][1] }; n.onArrive = null; n.speed = 3.4;
      n.ai = (dt) => { if (!near(g, A, 22)) return; n.next -= dt; if (n.next < 0 && !n.target) { n.next = rand(1.9, 3.4); const tgt = new THREE.Vector3(g.p.pos.x + rand(-1.4, 1.4) + g.p.vel.x * 0.4, g.p.pos.y + 1.1, g.p.pos.z + rand(-1.4, 1.4) + g.p.vel.z * 0.4); const from = new THREE.Vector3(n.pos.x, n.pos.y + 1.4, n.pos.z); const dir = tgt.clone().sub(from); const dist = dir.length(); dir.y += dist * 0.18; n.a.st.throw = 0.35; g.throwBall(from.addScaledVector(dir.clone().normalize(), 0.5), dir, Math.min(17, 7 + dist * 0.7), 'npc'); if (Math.random() < 0.35) { const s = spots[Math.floor(rand(0, spots.length))]; n.target = { x: s[0], z: s[1] }; } } };
    }
    g.dbgFight = () => g.onBallHit?.({ npc: maria });
    g.onBallHit = (h) => { if (h.npc === maria || h.npc === nikos) { mine++; h.npc.a.st.wave = 0.5; g.audio.chime([1319, 1568], 0.06, 0.14); g.ui.toast(`Πέτυχες ${h.npc === maria ? 'τη Μαρία' : 'τον Νίκο'}! (${mine}/10)`, 1400); g.ui.progress(`Εσύ ${mine} – ${theirs} Αυτοί`); } };
    g.onPlayerHit = () => { theirs++; g.ui.progress(`Εσύ ${mine} – ${theirs} Αυτοί`); g.root.querySelector('#fade').animate([{ background: '#fff', opacity: 0.55 }, { background: '#fff', opacity: 0 }], { duration: 400 }); };
    await g.until(() => mine >= 10 || theirs >= 10);
    g.canThrow = false; maria.ai = nikos.ai = null; g.onBallHit = g.onPlayerHit = null; g.setBeacon(null);
    if (mine >= 10) break;
    await g.say([NI('ΧΑ! Κερδίσαμε! Θες ρεβάνς;'), K('Φυσικά! Αυτή τη φορά δεν θα μου ξεφύγετε!')]);
  }
  maria.a.st.cheer = nikos.a.st.cheer = 0; g.kid.st.cheer = 2.5; confetti(g, { x: g.p.pos.x, y: g.p.pos.y, z: g.p.pos.z });
  await g.say([NI('Εντάξει, εντάξει! Παραδινόμαστε! Είσαι {ο πρωταθλητής|η πρωταθλήτρια} του χιονοπόλεμου!'), MA('Είμαι μούσκεμα… Ωχ! ΤΑ ΓΑΝΤΙΑ ΜΟΥ!'), MA('Μου έπεσαν όλα στη λίμνη όταν κάναμε πατινάζ το πρωί! Και τα δικά μου και του Νίκου!'), NI('Η λίμνη είναι παγωμένη και γλιστράει πολύ. Πρόσεχε!')]);
  // ---- παγωμένη λίμνη
  g.slippery = true; const L = P.lake, cols = [0xff6aa8, 0x9b2cff, 0x0f7b4b, 0xf6c453, 0x38c7ff];
  let gl = 0; g.ui.objective('Μάζεψε τα 5 γάντια στην παγωμένη λίμνη', '0/5'); g.setBeacon({ x: L.x, z: L.z }); tutorial(g, 'ice', { max: 14 });
  const gloves = cols.map((col, i) => { const a = i * 1.26 + 0.4, r = 4 + (i % 3) * 3.5, m = new THREE.Group(); const s = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshStandardMaterial({ color: col })); s.scale.set(1, 0.5, 1.4); const th = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), s.material); th.position.set(0.11, 0, 0.02); m.add(s, th); m.position.set(L.x + Math.cos(a) * r, LAKE_Y + 0.08, L.z + Math.sin(a) * r); g.keep(m); const sp = glowSprite('rgba(255,240,180,1)', 1); sp.position.copy(m.position).y += 0.4; g.keep(sp); return { m, sp, got: false }; });
  maria.follow = () => ({ x: L.x + 18, z: L.z }); nikos.follow = () => ({ x: L.x + 18, z: L.z + 3 });
  g.dbg = () => gloves.filter((o) => !o.got).map((o) => o.m.position);
  g.tick = (dt, t) => { for (const o of gloves) { if (o.got) continue; o.m.rotation.y += dt; if (Math.hypot(g.p.pos.x - o.m.position.x, g.p.pos.z - o.m.position.z) < 1.1) { o.got = true; g.scene.remove(o.m); g.scene.remove(o.sp); gl++; g.ui.progress(`${gl}/5`); g.audio.chime([1175, 1568], 0.07, 0.15); if (gl === 1) g.setBeacon(null); } } };
  await g.until(() => gl >= 5); g.dbg = null;
  g.tick = null; g.slippery = false; g.ui.toast('Όλα τα γάντια βρέθηκαν!');
  maria.follow = nikos.follow = null; maria.target = { x: L.x + 20, z: L.z - 1 }; nikos.target = { x: L.x + 20, z: L.z + 2.5 }; maria.onArrive = () => { maria.look = 'player'; }; nikos.onArrive = () => { nikos.look = 'player'; };
  g.ui.objective('Γύρνα στους φίλους σου'); g.setBeacon({ x: L.x + 20, z: L.z + 1 });
  await g.until(() => near(g, { x: L.x + 20, z: L.z + 1 }, 5)); g.setBeacon(null);
  await g.say([MA('Ευχαριστώ!!! Είσαι ήρωας!'), NI('Ο ήλιος πέφτει… Δείτε, ο ουρανός έγινε πορτοκαλί!')]);
  // ---- ηλιοβασίλεμα & το μυστήριο
  g.world.setTime('sunset', 14); g.audio.musicVol(0.18); await g.wait(5);
  const fp = g.keep(chalkPrints(g, [{ x: P.snowman.x + 2, z: P.snowman.z - 1 }, { x: P.snowman.x + 6, z: P.snowman.z - 8 }])); g.world.anim.push(fp.anim);
  g.locked = true; g.cine = { pos: new THREE.Vector3(P.snowman.x - 4, height(P.snowman.x, P.snowman.z) + 3, P.snowman.z + 6), look: new THREE.Vector3(P.snowman.x + 3, height(P.snowman.x, P.snowman.z), P.snowman.z - 4), speed: 1.4 };
  g.teleport(P.snowman.x - 2, P.snowman.z + 4, 0.6);
  maria.pos.set(P.snowman.x - 3.5, 0, P.snowman.z + 3); nikos.pos.set(P.snowman.x - 0.5, 0, P.snowman.z + 5); maria.target = nikos.target = null; maria.look = nikos.look = { x: P.snowman.x + 3, z: P.snowman.z - 4 };
  await g.say([MA('Περιμένετε… Τι είναι αυτά εκεί, δίπλα στον Κύριο Χιονούλη;'), K('Πατημασιές… που ΛΑΜΠΟΥΝ;'), NI('Μοιάζουν φτιαγμένες από… κιμωλία!'), K('Οι κιμωλίες που χάθηκαν από την τάξη! Και το έλκηθρο στον πίνακα…'), MA('Ποιος περπατάει με παπούτσια από κιμωλία;! Μου φαίνεται πολύ μυστήριο…'), NI('Εμένα μου φαίνεται πολύ… τρομακτικό. Όχι ότι φοβάμαι. Απλώς λέω.'), NI('Πρέπει να γυρίσουμε σπίτι. Οι γονείς μας θα ανησυχούν.'), MA('Κι εσύ μην αργήσεις! Τα λέμε αύριο!'), K('Ναι… αύριο. Εγώ απλώς θα… ρίξω μια ματιά. Μόνο λίγο!')]);
  g.cine = null; g.locked = false;
  maria.look = nikos.look = null; maria.target = { x: -10, z: 20 }; nikos.target = { x: 30, z: 30 }; maria.onArrive = () => g.removeNPC(maria); nikos.onArrive = () => g.removeNPC(nikos);
  maria.a.st.wave = nikos.a.st.wave = 1.5; await g.wait(4);
  if (g.npcs.includes(maria)) g.removeNPC(maria); if (g.npcs.includes(nikos)) g.removeNPC(nikos);
  g.state.friends = null;
}

/** Λαμπερές πατημασιές από κιμωλία κατά μήκος μιας διαδρομής. */
function chalkPrints(g, pts, every = 0.75) {
  const tex = canvasTex(64, 96, (c) => { c.fillStyle = 'rgba(255,255,255,1)'; c.beginPath(); c.ellipse(32, 56, 17, 30, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(32, 18, 14, 13, 0, 0, 7); c.fill(); });
  const list = []; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], L = Math.hypot(b.x - a.x, b.z - a.z), n = Math.floor(L / every); for (let k = 0; k < n; k++) { const t = k / n, x = lerp(a.x, b.x, t), z = lerp(a.z, b.z, t), yaw = Math.atan2(b.x - a.x, b.z - a.z), side = (list.length % 2 ? 1 : -1) * 0.18; list.push({ x: x + Math.cos(yaw) * side, z: z - Math.sin(yaw) * side, yaw }); } }
  const geo = new THREE.PlaneGeometry(0.22, 0.34); geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, color: 0xe6f6ff, blending: THREE.AdditiveBlending, opacity: 0.95 });
  const m = new THREE.InstancedMesh(geo, mat, list.length), D = new THREE.Object3D();
  list.forEach((p, i) => { D.position.set(p.x, height(p.x, p.z) + 0.03, p.z); D.rotation.set(0, p.yaw, 0); D.updateMatrix(); m.setMatrixAt(i, D.matrix); });
  m.anim = (dt, t) => { mat.opacity = 0.7 + Math.sin(t * 2.2) * 0.25; }; m.count = list.length; return m;
}

// =================================================================== 4. Τα ίχνη από κιμωλία
async function ch4(g, c) {
  g.world.setIndoor(false); if (g.world.timeName !== 'sunset') g.world.setTime('sunset', 0.01); g.audio.musicLoop(MUSIC, LS, LE, 0.16);
  if (!near(g, P.snowman, 30)) { g.teleport(P.snowman.x - 2, P.snowman.z + 3, 0.6); await g.fadeTo(0, 1); }
  g.ui.chapter(c.n, c.title); g.world.setTime('night', 70);
  const route = [{ x: P.snowman.x + 2, z: P.snowman.z - 1 }, { x: P.snowman.x + 6, z: P.snowman.z - 8 }, { x: 40, z: -30 }, { x: 34, z: -48 }, { x: 31, z: -66 }, { x: 30, z: -84 }, { x: 24, z: -98 }, { x: pathX(-104), z: -104 }, { x: pathX(-110), z: -110 }];
  const fp = g.keep(chalkPrints(g, route)); g.world.anim.push(fp.anim);
  const gifts = [[40, -24], [36, -42], [31.5, -60], [32, -78], [27, -93], [pathX(-102) + 1.4, -102]];
  let got = g.state.gifts || 0; const lines = { 1: K('Ένα δώρο; Με χρυσή κορδέλα! Κάποιος το έχασε…'), 3: K('Αυτό έχει καρτελάκι: «Για τη Μαρία». ΤΙ;!'), 5: K('…«Για τον Νίκο». Όποιος κι αν είναι, ξέρει τους φίλους μου!'), 6: K('Και το τελευταίο… γράφει το ΔΙΚΟ ΜΟΥ όνομα!!!') };
  g.ui.objective('Ακολούθησε τα λαμπερά ίχνη', `Δώρα: ${got}/6`);
  await g.say([K('Τα ίχνη πάνε προς τα εκεί… Βόρεια. Προς το δάσος.')]);
  const giftItems = gifts.map(([x, z], i) => { const m = makeGift(i, 0.42); m.rotation.y = rand(0, 3); const sp = glowSprite('rgba(255,215,120,1)', 1.4); sp.position.set(x, height(x, z) + 0.45, z); g.keep(sp); const it = item(g, m, x, height(x, z), z, 'Μάζεψε το δώρο', 2); it.fn = async () => { pickup(g, it); g.scene.remove(sp); got++; g.state.gifts = got; g.ui.progress(`Δώρα: ${got}/6`); g.audio.bell(1568, 0.2); if (lines[got]) await g.say([lines[got]]); }; return it; });
  // η λάμπα κρεμασμένη σε φράχτη, στη μέση της διαδρομής
  const lamp = new THREE.Group(); const body = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.28, 8), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.6 })); const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.2, 8), new THREE.MeshBasicMaterial({ color: 0xffd28a })); glass.position.y = 0.02; lamp.add(body, glass);
  const lsp = glowSprite('rgba(255,200,120,1)', 1.8); lamp.add(lsp);
  const li = item(g, lamp, 33, height(33, -52) + 1.1, -52, 'Πάρε τη λάμπα', 2.2);
  li.fn = async () => { pickup(g, li); g.lantern(true); g.ui.toast('Πήρες τη λάμπα! Τώρα βλέπεις στο σκοτάδι.'); await g.say([K('Μια λάμπα πετρελαίου; Ποιος την άφησε εδώ; Θα μου χρειαστεί.')]); };
  // σκισμένο γράμμα
  const letter = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5), new THREE.MeshStandardMaterial({ map: signTex(['…οι τάρανδοι', 'τρόμαξαν…', '— Κ.'], { w: 256, h: 320, bg: '#f7efd9', fg: '#5a3520', font: 'italic bold 34px Georgia,serif', border: '#c9b38a' }), side: THREE.DoubleSide }));
  letter.rotation.x = -Math.PI / 2 + 0.2; const lt = item(g, letter, 29, height(29, -88) + 0.05, -88, 'Διάβασε το χαρτί', 2);
  lt.fn = async () => { pickup(g, lt); await g.say([N('«…ο Άγιος Βασίλης κρυολόγησε κι εγώ πρέπει να μοιράσω τα δώρα. Αλλά οι τάρανδοι τρόμαξαν κι έφυγαν στο δάσος…»'), N('«…φέτος ένα παιδί ζήτησε μόνο χιόνι, για να παίξουν όλοι μαζί. Του το χαρίσαμε. Ήταν η πιο όμορφη ευχή της χρονιάς.»'), N('«…πρέπει να βρω τους τάρανδους πριν τα μεσάνυχτα! — Κ.»'), K('Αυτό… είναι το ΔΙΚΟ μου γράμμα!'), K('Και «Κ.»… Κ όπως… ΚΙΜΩΛΑΚΗΣ;!')]); };
  g.setBeacon(route[route.length - 1]);
  await g.until(() => near(g, route[route.length - 1], 6));
  if (!g.lanternOn) { g.lantern(true); g.ui.toast('Άναψες τη λάμπα σου.'); }
  g.setBeacon(null); g.audio.setWind(1.2);
  g.audio.play('../../audio/sfx/swell.mp3', { vol: 0.25, rate: 0.6 });
  await g.say([N('Χουουου… χουουου…'), K('Μια κουκουβάγια. Μόνο μια κουκουβάγια…'), K('Το δάσος. Τη νύχτα. {Μόνος|Μόνη} μου.'), K('Εντάξει. Είμαι {γενναίος|γενναία}. ΕΙΜΑΙ {ΓΕΝΝΑΙΟΣ|ΓΕΝΝΑΙΑ}. Πάμε.')]);
  for (const it of giftItems) if (g.inter.includes(it)) { g.removeInter(it); g.scene.remove(it.mesh); }
}

// =================================================================== 5. Το δάσος τη νύχτα
async function ch5(g, c) {
  g.world.setIndoor(false); if (g.world.timeName !== 'night') g.world.setTime('night', 0.01); g.lantern(true); g.audio.musicLoop(MUSIC, LS, LE, 0.12);
  if (!near(g, { x: pathX(-110), z: -110 }, 20)) { g.teleport(pathX(-108), -108, Math.PI); await g.fadeTo(0, 1); }
  g.ui.chapter(c.n, c.title);
  g.ui.objective('Ακολούθησε το μονοπάτι στο δάσος'); g.setBeacon({ x: P.clearing.x, z: P.clearing.z + 10 });
  // το κολλημένο έλκηθρο στο ξέφωτο
  const CL = P.clearing, sleigh = makeSleigh(); sleigh.position.set(CL.x + 2, height(CL.x, CL.z) - 0.45, CL.z - 2); sleigh.rotation.set(0.12, 0.5, 0.08); g.keep(sleigh);
  const sb = g.phys.box(CL.x + 2, CL.z - 2, 1, 1.6, 0.5, 2);
  // φωτιά στο ξέφωτο
  const fire = new THREE.PointLight(0xff8a3a, 30, 18, 1.6); fire.position.set(CL.x - 3, height(CL.x - 3, CL.z + 2) + 0.8, CL.z + 2); g.keep(fire);
  const flame = glowSprite('rgba(255,150,60,1)', 2.2); flame.position.copy(fire.position); g.keep(flame);
  const logs = new THREE.Group(); for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1, 6), new THREE.MeshStandardMaterial({ color: 0x4a2c18 })); l.rotation.set(Math.PI / 2, i * 0.8, 0.35); l.position.y = 0.15; logs.add(l); } logs.position.set(fire.position.x, fire.position.y - 0.8, fire.position.z); g.keep(logs);
  g.tick = (dt, t) => { fire.intensity = 26 + Math.sin(t * 13) * 4 + Math.sin(t * 7.3) * 3; flame.scale.setScalar(2 + Math.sin(t * 11) * 0.2); };
  await g.until(() => near(g, CL, 22));
  g.setBeacon(null);
  await g.say([N('«Αχ, αχ, αχ… Και τώρα τι κάνω;»'), K('Μια φωνή! Και ένα… ΕΛΚΗΘΡΟ;!')]);
  const kimo = g.addNPC(makeKimolakis(), CL.x - 1, CL.z - 4, 0); kimo.voice = 's'; kimo.look = 'player'; g.state.kimo = kimo;
  g.ui.objective('Πλησίασε το έλκηθρο'); g.setBeacon({ x: kimo.pos.x, z: kimo.pos.z });
  await g.until(() => near(g, kimo.pos, 6.5)); g.setBeacon(null);
  g.locked = true; kimo.a.st.talk = 30;
  const lookAtKimo = () => { g.cine = { pos: new THREE.Vector3(kimo.pos.x + 2.6, kimo.pos.y + 2, kimo.pos.z + 3.4), look: new THREE.Vector3(kimo.pos.x, kimo.pos.y + 1.4, kimo.pos.z), speed: 1.6 }; };
  lookAtKimo();
  await g.say([KI('Ποιος… ποιος είναι εκεί;'), KI('Α! ΕΣΥ είσαι {αυτός|αυτή} που με ακολουθεί από το απόγευμα!'), K('Εσύ… εσύ είσαι ο ΚΙΜΩΛΑΚΗΣ! Η κιμωλία από τον πίνακα της τάξης μας!'), KI('Και εσύ είσαι το παιδί με το γράμμα! «Θέλω μόνο να χιονίσει». Ε λοιπόν; Σου άρεσε το χιόνι μου;'), K('ΕΣΥ το έφτιαξες;! Ήταν το καλύτερο χιόνι της ζωής μου!'), KI('Σςςς! Μη φωνάζεις, θα ξυπνήσεις όλο το δάσος!'), KI('Ναι, εγώ είμαι. Κάθε χρόνο, όταν κλείνουν τα σχολεία, βγαίνω από τον πίνακα και βοηθάω τον Άγιο Βασίλη.'), KI('Φέτος όμως ο Άγιος Βασίλης κρυολόγησε. Αψού! Και μου είπε: «Κιμωλάκη, αναλαμβάνεις εσύ!»'), KI('Φόρεσα τη στολή του, φόρτωσα το έλκηθρο… και ΜΠΑΜ! Ένα κλαδί έπεσε, οι τάρανδοι τρόμαξαν και το έσκασαν!'), KI('Ο σάκος σκίστηκε και σκόρπισαν δώρα σε όλη την πόλη…')]);
  if ((g.state.gifts || 0) > 0) { await g.say([K(`Αυτά εννοείς; Βρήκα ${g.state.gifts} δώρα στον δρόμο!`), KI('ΤΑ ΔΩΡΑ! Είσαι {καταπληκτικός|καταπληκτική}! Γι\' αυτό τα ίχνη μου σε έφεραν εδώ.')]); kimo.a.st.cheer = 2; }
  await g.say([KI('Χωρίς τους τρεις τάρανδους μου — τον Ρούντολφ, την Αστραπή και τον Χιονούλη — το έλκηθρο δεν πετάει.'), KI('Και αν δεν μοιράσουμε τα δώρα ως τα μεσάνυχτα, χιλιάδες παιδιά θα ξυπνήσουν χωρίς δώρο τα Χριστούγεννα.'), KI('Κι εγώ… η μαγεία που με ξυπνάει θα σβήσει. Θα γίνω ξανά μια απλή κιμωλία. Για πάντα.'), K('ΟΧΙ! Δεν θα το αφήσω να γίνει αυτό!'), K('Θα σε βοηθήσω! Πού πήγαν;'), KI('Κάθε τάρανδος φοράει ένα κουδουνάκι. Σταμάτα, κράτα την ανάσα σου και ΑΚΟΥ. Ακολούθησε τον ήχο!'), KI('Όταν βρεις έναν, χάιδεψέ τον απαλά. Θα σε ακολουθήσει.')]);
  g.cine = null; g.locked = false; kimo.a.st.talk = 0;
  // ---- τάρανδοι
  const names = ['Ρούντολφ', 'Αστραπή', 'Χιονούλης'], deer = P.reindeer.map((p, i) => { const n = g.addNPC(makeReindeer({ rudolph: i === 0, collar: [0xc8102e, 0x2b6cb0, 0x0f7b4b][i] }), p.x, p.z, rand(0, 6)); n.speed = 3.2; n.name = names[i]; n.found = false; return n; });
  let found = 0, searchT = 0; g.ui.objective('Βρες τους 3 τάρανδους (άκου τα κουδουνάκια)', '0/3'); tutorial(g, 'listen', { max: 18, min: 10 });
  const freq = [1568, 1319, 1760];
  g.tick = (dt, t) => {
    fire.intensity = 26 + Math.sin(t * 13) * 4; flame.scale.setScalar(2 + Math.sin(t * 11) * 0.2); searchT += dt;
    deer.forEach((d, i) => {
      if (!d.found && Math.floor(t * 0.9 + i * 0.33) !== Math.floor((t - dt) * 0.9 + i * 0.33)) { g.audio.bell(freq[i], 0.5, { x: d.pos.x, y: d.pos.y + 1.4, z: d.pos.z }); setTimeout(() => g.audio.bell(freq[i] * 1.26, 0.35, { x: d.pos.x, y: d.pos.y + 1.4, z: d.pos.z }), 140); }
      if (!d.found && !d.inter) { d.inter = g.addInter({ pos: () => d.pos, r: 3, label: `Χάιδεψε τον τάρανδο (${d.name})` }); d.inter.fn = async () => { g.removeInter(d.inter); d.found = true; found++; g.ui.progress(`${found}/3`); g.audio.chime([1047, 1319, 1568], 0.08, 0.16); d.follow = () => g.p.pos; d.followDist = 2.6 + i * 1.3; g.setBeacon(null); searchT = 0; await g.say([K(i === 0 ? 'Ρούντολφ! Η μύτη σου λάμπει σαν φανάρι!' : i === 1 ? 'Αστραπή! Μη φοβάσαι, έλα μαζί μου.' : 'Χιονούλη! Είσαι ο πιο χνουδωτός τάρανδος του κόσμου!')]); }; }
    });
    // βοήθεια αν δυσκολεύεσαι
    if (searchT > 50 && found < 3 && !g.beaconPos) { const d = deer.find((q) => !q.found); g.setBeacon({ x: d.pos.x, z: d.pos.z }); g.ui.toast('Ο Ρούντολφ σου δείχνει τον δρόμο με το φως του…'); }
  };
  await g.until(() => found >= 3);
  g.ui.objective('Φέρε τους τάρανδους στο ξέφωτο'); g.setBeacon({ x: CL.x, z: CL.z });
  await g.until(() => near(g, CL, 7));
  g.setBeacon(null); g.tick = (dt, t) => { fire.intensity = 26 + Math.sin(t * 13) * 4; flame.scale.setScalar(2 + Math.sin(t * 11) * 0.2); };
  deer.forEach((d, i) => { d.follow = null; d.target = { x: CL.x + 2 + Math.sin(0.5) * (3.4 + i * 1.6), z: CL.z - 2 + Math.cos(0.5) * (3.4 + i * 1.6) }; d.onArrive = () => { d.look = { x: CL.x + 10, z: CL.z + 15 }; }; });
  kimo.a.st.cheer = 2.5; confetti(g, kimo.pos);
  await g.say([KI('ΡΟΥΝΤΟΛΦ! ΑΣΤΡΑΠΗ! ΧΙΟΝΟΥΛΗ! Είστε όλοι εδώ!'), KI('Είσαι {ο καλύτερος|η καλύτερη} βοηθός που είχα ποτέ!'), KI('Μένει ένα πρόβλημα: το έλκηθρο κόλλησε στο χιόνι. Βοήθησέ με να το σπρώξουμε!')]);
  // ---- σπρώξιμο: στάσου πίσω από το έλκηθρο και ΚΡΑΤΑ πατημένη την ενέργεια (ή πάτα ξανά και ξανά)
  const yaw = 0.5, back = { x: CL.x + 2 - Math.sin(yaw) * 2.6, z: CL.z - 2 - Math.cos(yaw) * 2.6 }, s0 = sleigh.position.clone();
  kimo.target = { x: back.x - Math.cos(yaw) * 1.3, z: back.z + Math.sin(yaw) * 1.3 }; kimo.onArrive = () => { kimo.look = { x: CL.x + 2, z: CL.z - 2 }; };
  g.ui.objective('Σπρώξε το έλκηθρο!', '0%'); g.setBeacon({ x: back.x, z: back.z }); tutorial(g, 'push', { max: 60 });
  let push = 0, freed = false, holdT = 0, said = 0;
  const pi = g.addInter({ pos: back, r: 3.4, label: 'ΚΡΑΤΑ για να σπρώξεις!' });
  pi.fn = () => { push = Math.min(100, push + 6); };   // κάθε πάτημα βοηθάει κι αυτό
  g.tick = (dt, t) => {
    fire.intensity = 26 + Math.sin(t * 13) * 4; flame.scale.setScalar(2 + Math.sin(t * 11) * 0.2);
    const close = Math.hypot(g.p.pos.x - back.x, g.p.pos.z - back.z) < 3.4;
    const held = close && (!g.ui.cur || g.ui.cur.lock === false) && (g.input.down('KeyE', 'Enter') || (g.inVR && (g.vr.state.trigger[0] || g.vr.state.trigger[1])));
    if (held) { push = Math.min(100, push + dt * 20); holdT += dt; tutMark(g, 'push', dt / 2); g.kid.st.throw = 0.2; if (Math.random() < dt * 8) { g.splat.burst(new THREE.Vector3(sleigh.position.x + rand(-1, 1), sleigh.position.y + 0.3, sleigh.position.z + rand(-1, 1)), 6, 2); g.audio.crunch(0.25); } if (g.inVR && Math.random() < dt * 6) for (const src of g.vr.session.inputSources) src.gamepad?.hapticActuators?.[0]?.pulse?.(0.4, 40); }
    else push = Math.max(0, push - dt * 3);
    // το έλκηθρο κουνιέται και γλιστράει μπροστά όσο ανεβαίνει η μπάρα
    const k = push / 100; sleigh.position.set(s0.x + Math.sin(yaw) * k * 1.6 + (held ? rand(-0.02, 0.02) : 0), s0.y + k * 0.35, s0.z + Math.cos(yaw) * k * 1.6);
    deer.forEach((d) => { d.a.st.cheer = held ? 0.3 : 0; });
    if (held && kimo.a) kimo.a.st.cheer = 0.3;
    g.ui.progress(`${Math.round(push)}%`);
    if (push >= 35 && said === 0) { said = 1; g.say([{ ...KI('Αυτό είναι! Κουνήθηκε!'), auto: 1.6, lock: false }]); }
    if (push >= 75 && said === 1) { said = 2; g.say([{ ...KI('ΛΙΓΟ ΑΚΟΜΑ! Ένα… δύο…'), auto: 1.6, lock: false }]); }
    if (push >= 100) freed = true;
  };
  await g.say([KI('Εγώ σπρώχνω από τη μία πλευρά, εσύ από πίσω. Στο τρία!')]);
  await g.until(() => freed);
  closeTutorial(g); g.ui.objective(''); g.removeInter(pi); g.tick = (dt, t) => { fire.intensity = 26 + Math.sin(t * 13) * 4; }; g.phys.remove(sb); g.setBeacon(null);
  for (let i = 0; i < 30; i++) setTimeout(() => { sleigh.position.y += 0.01; sleigh.rotation.x *= 0.9; sleigh.rotation.z *= 0.9; }, i * 30);
  confetti(g, sleigh.position); g.audio.bell(1319, 0.4); g.audio.bell(1760, 0.3);
  await g.say([KI('…ΤΡΙΑ! ΝΑΙΙΙ! Ελεύθερο!'), KI('Είναι 23:00. Μας μένει μία ώρα για όλη την πόλη.'), KI('Και τώρα, το πιο σημαντικό: θέλεις να έρθεις μαζί μου;'), KI('Χρειάζομαι βοηθό για να ρίχνει τα δώρα μέσα στις καμινάδες!'), K('ΕΓΩ;! Σε ΙΠΤΑΜΕΝΟ έλκηθρο;! ΦΥΣΙΚΑ!')]);
  await g.fadeTo(1, 1);
  g.lantern(false);
}

// =================================================================== 6. Η πτήση του έλκηθρου
async function ch6(g, c) {
  g.world.setIndoor(false); g.world.setTime('night', 0.01); g.world.skyU.aurora.value = 1; g.world.snowMul = 0.35; g.world.applyTime(g.world.cur || {});
  for (const n of [...g.npcs]) g.removeNPC(n);
  // το ταξίδι
  const rig = new THREE.Group(); g.keep(rig); const sl = makeSleigh(); rig.add(sl);
  const kimo = makeKimolakis(); kimo.root.position.set(-0.4, 0.95, -0.5); kimo.root.scale.setScalar(0.9); rig.add(kimo.root);
  const deer = [0, 1, 2].map((i) => { const d = makeReindeer({ rudolph: i === 0, collar: [0xc8102e, 0x2b6cb0, 0x0f7b4b][i] }); d.root.position.set(i === 0 ? 0 : (i === 1 ? -0.8 : 0.8), 0.4, i === 0 ? 7.2 : 4.6); rig.add(d.root); return d; });
  const reins = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 1.4, 1.4), new THREE.Vector3(0, 1.7, 7.2), new THREE.Vector3(-0.8, 1.7, 4.6), new THREE.Vector3(0.8, 1.7, 4.6)]), new THREE.LineBasicMaterial({ color: 0xf6c453 }));
  rig.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.3, 1.4, 1.4), new THREE.Vector3(0, 1.7, 7), new THREE.Vector3(0.3, 1.4, 1.4), new THREE.Vector3(0, 1.7, 7), new THREE.Vector3(-0.3, 1.4, 1.4), new THREE.Vector3(-0.8, 1.7, 4.4), new THREE.Vector3(0.3, 1.4, 1.4), new THREE.Vector3(0.8, 1.7, 4.4)]), new THREE.LineBasicMaterial({ color: 0xf6c453 })));
  const seat = new THREE.Object3D(); seat.position.set(0.45, 1.05, -0.65); rig.add(seat); g.sleighSeat = seat;
  const trail = []; for (let i = 0; i < 40; i++) { const s = glowSprite('rgba(255,230,150,1)', 0.6); s.visible = false; g.keep(s); trail.push({ s, life: 0 }); }
  const S = { pos: new THREE.Vector3(0, 40, 60), yaw: Math.PI, pitch: 0, roll: 0, speed: 15 };
  g.p.mode = 'sleigh'; g.kid.root.visible = false; if (g.inVR) g.rig.rotation.y = S.yaw + Math.PI;
  // στόχοι: 10 καμινάδες + δαχτυλίδια
  const chim = g.world.chimneys.slice(0, 10).map((p, i) => { const b = makeBeacon(0xffd36b); b.g.scale.set(0.5, 0.25, 0.5); b.g.position.set(p.x, p.y, p.z); g.keep(b.g); return { ...p, b, done: false }; });
  const rings = []; for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, r = 70 + Math.sin(i * 1.7) * 18; const m = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.22, 10, 36), new THREE.MeshBasicMaterial({ color: 0xffd36b })); m.position.set(Math.cos(a) * r, 26 + Math.sin(i * 2.1) * 8, Math.sin(a) * r - 10); m.rotation.y = -a; g.keep(m); const gl = glowSprite('rgba(255,210,110,1)', 9); gl.position.copy(m.position); gl.material.opacity = 0.35; g.keep(gl); rings.push({ m, gl, done: false }); }
  let delivered = 0, ringsGot = 0; const drops = [];
  const WHO = ['τη Μαρία', 'τον Νίκο', 'τον μικρό Άρη', 'την κυρία Ελένη', 'τον κύριο Σταύρο', 'τη Δανάη και τον Πέτρο', 'τη γιαγιά του Νίκου (και το γόνατό της)', 'τα δίδυμα του τρίτου σπιτιού', 'τη Ζωή', 'τον Λευτέρη'];
  g.ui.chapter(c.n, c.title); g.audio.musicLoop(MUSIC, LS, LE, 0.85, 1);
  await g.fadeTo(0, 1.5);
  const steerText = g.inVR ? 'Αριστερό μοχλό: τιμόνι & ύψος · Σκανδάλη: ρίξε δώρο' : DEVICE.touch ? 'Joystick: τιμόνι & ύψος · ✋: ρίξε δώρο' : 'A/D ή ποντίκι: στροφή · W/S: ύψος · E ή κλικ: ρίξε δώρο';
  g.say([KI('ΟΧΟ-ΧΟ-ΧΟ! Κράτα γερά!'), KI('Κράτα εσύ τα γκέμια — οι τάρανδοι σε εμπιστεύονται!'), KI('Πέτα πάνω από τις καμινάδες που λάμπουν και ΡΙΞΕ ένα δώρο μέσα!'), N(steerText)]).then(() => tutorial(g, 'fly', { max: 50 }));
  g.ui.objective('Ρίξε δώρα στις καμινάδες που λάμπουν', `0/${chim.length}`);
  g.sleighCam = (cam, dt) => { const back = new THREE.Vector3(Math.sin(S.yaw) * -9, 4.2, Math.cos(S.yaw) * -9); const want = S.pos.clone().add(back); cam.position.lerp(want, Math.min(1, dt * 4)); cam.lookAt(S.pos.clone().add(new THREE.Vector3(Math.sin(S.yaw) * 6, 1.5, Math.cos(S.yaw) * 6))); };
  let lastYaw = S.yaw, said3 = false, said7 = false;
  g.dbgSleigh = () => { const ch = chim.find((q) => !q.done); if (ch) { S.pos.set(ch.x, ch.y + 1.5, ch.z); S.speed = 0.01; return true; } };
  g.tick = (dt, t) => {
    const inp = g.input, vr = g.inVR; let sx = 0, sy = 0;
    if (vr) { sx = g.vr.state.lx + g.vr.state.rx * 0.6; sy = -g.vr.state.ly; } else { const a = inp.axes(); sx = a.x + clamp(inp.look.x * 18, -1, 1); sy = a.y - clamp(inp.look.y * 18, -1, 1); }
    if (Math.abs(sx) > 0.2) tutMark(g, 'steer', dt / 1.5); if (Math.abs(sy) > 0.2) tutMark(g, 'climb', dt / 1.5);
    S.yaw -= sx * dt * 1.05; S.pitch = lerp(S.pitch, sy * 0.4, Math.min(1, dt * 3)); S.roll = lerp(S.roll, sx * 0.45, Math.min(1, dt * 3));
    const fwd = new THREE.Vector3(Math.sin(S.yaw), 0, Math.cos(S.yaw));
    S.pos.addScaledVector(fwd, S.speed * dt); S.pos.y = clamp(S.pos.y + S.pitch * 14 * dt, Math.max(14, height(S.pos.x, S.pos.z) + 10), 70);
    const r = Math.hypot(S.pos.x, S.pos.z + 10); if (r > 135) { const want = Math.atan2(-S.pos.x, -(S.pos.z + 10)); S.yaw += Math.sign(Math.sin(want - S.yaw)) * dt * 0.8; }
    rig.position.copy(S.pos); rig.rotation.set(-S.pitch * 0.4, S.yaw, 0, 'YXZ'); sl.rotation.z = -S.roll * 0.6; rig.position.y += Math.sin(t * 2) * 0.15;
    if (vr) { g.rig.rotation.y += S.yaw - lastYaw; } lastYaw = S.yaw;
    deer.forEach((d, i) => { d.update(dt, 4, t + i); d.root.position.y = 0.4 + Math.sin(t * 3 + i) * 0.18; });
    kimo.update(dt, 0, t);
    // μαγική σκόνη πίσω από τους τάρανδους
    const tr = trail.find((q) => q.life <= 0); if (tr) { tr.life = 1.2; tr.s.visible = true; tr.s.position.copy(S.pos).add(new THREE.Vector3(rand(-1, 1), 0.5, rand(-1, 1))).addScaledVector(fwd, -2); }
    for (const q of trail) if (q.life > 0) { q.life -= dt; q.s.material.opacity = q.life / 1.2; q.s.scale.setScalar(0.3 + q.life * 0.5); if (q.life <= 0) q.s.visible = false; }
    // δώρα που πέφτουν
    const want = inp.hit('KeyE', 'Mouse0', 'Space') || (vr && (g.vr.edge('trigger', 0) || g.vr.edge('trigger', 1) || g.vr.edge('a')));
    if (want && !g.ui.cur && drops.length < 6) { const m = makeGift(Math.floor(rand(0, 6)), 0.5); m.position.copy(S.pos).add(new THREE.Vector3(0, 0.8, 0)); g.scene.add(m); drops.push({ m, v: fwd.clone().multiplyScalar(S.speed * 0.8).add(new THREE.Vector3(0, 1, 0)) }); tutMark(g, 'drop'); g.audio.play('../../audio/sfx/pop.mp3', { vol: 0.4 }); }
    for (let i = drops.length - 1; i >= 0; i--) { const d = drops[i]; d.v.y -= 12 * dt; d.v.x *= 1 - dt * 0.4; d.v.z *= 1 - dt * 0.4; d.m.position.addScaledVector(d.v, dt); d.m.rotation.y += dt * 4; d.m.rotation.x += dt * 2; const p = d.m.position;
      let end = p.y < height(p.x, p.z);
      for (const ch of chim) if (!ch.done && p.y < ch.y + 1.2 && p.y > ch.y - 2 && Math.hypot(p.x - ch.x, p.z - ch.z) < 3.6) { ch.done = true; delivered++; end = true; ch.b.g.visible = false; g.splat.burst(new THREE.Vector3(ch.x, ch.y + 0.5, ch.z), 40, 3); g.audio.chime([1047, 1319, 1568, 2093], 0.07, 0.2); g.ui.toast(`🎁 Δώρο για ${WHO[delivered - 1] || 'ένα παιδί της γειτονιάς'}! (${delivered}/${chim.length})`, 1800); g.ui.progress(`${delivered}/${chim.length}`); }
      if (end) { if (p.y < height(p.x, p.z) + 0.3) g.splat.burst(p, 10, 2); g.scene.remove(d.m); drops.splice(i, 1); }
    }
    for (const rg of rings) { rg.m.rotation.z += dt * 0.6; if (!rg.done && rg.m.position.distanceTo(S.pos) < 4.2) { rg.done = true; ringsGot++; rg.m.material.color.set(0x7fd1ae); rg.gl.material.opacity = 0.05; g.audio.chime([1568, 2093], 0.06, 0.16); g.ui.toast(`★ Αστέρι! (${ringsGot}/${rings.length})`, 1200); } }
    if (delivered >= 3 && !said3) { said3 = true; g.say([{ ...KI('Μπράβο! Είσαι {γεννημένος|γεννημένη} βοηθός του Αγίου Βασίλη!'), auto: 2.5, lock: false }, { ...KI('Ξέρεις γιατί μπορείς και με βλέπεις; Οι περισσότεροι μεγάλοι βλέπουν μόνο μια κιμωλία.'), auto: 3.5, lock: false }, { ...KI('Με βλέπουν μόνο όσοι εύχονται κάτι για ΟΛΟΥΣ, όχι μόνο για τον εαυτό τους.'), auto: 3.5, lock: false }]); }
    if (delivered >= 7 && !said7) { said7 = true; g.say([{ ...KI('Δες τον ουρανό! Το βόρειο σέλας ήρθε να μας δει!'), auto: 3, lock: false }, { ...KI('Είναι 23:50! Τρεις καμινάδες ακόμα!'), auto: 2.5, lock: false }]); }
    g.audio.listener(S.pos, fwd);
  };
  await g.until(() => delivered >= chim.length); g.dbgSleigh = null;
  await g.say([N('Το ρολόι της πλατείας χτυπάει μεσάνυχτα. ΝΤΑΝΓΚ… ΝΤΑΝΓΚ…'), KI('ΤΑ ΚΑΤΑΦΕΡΑΜΕ! Όλα τα δώρα είναι στη θέση τους — και ακριβώς στην ώρα τους!'), KI('Και εγώ… είμαι ακόμα εδώ! Κοίτα, λάμπω!'), KI(`Και μάζεψες ${ringsGot} αστέρια στη διαδρομή! ${ringsGot >= 10 ? 'Είσαι αστέρι κι εσύ!' : ''}`), KI('Τώρα θα σε πάω κάπου ξεχωριστά… Στο σχολείο σου!')]);
  await g.fadeTo(1, 1.2);
  g.tick = null; g.sleighCam = null; g.sleighSeat = null; g.p.mode = 'walk'; g.world.skyU.aurora.value = 0; g.world.snowMul = 1;
}

// =================================================================== 7. Χριστούγεννα!
async function ch7(g, c) {
  g.world.setIndoor(false); g.world.setTime('night', 0.01); g.audio.musicLoop(MUSIC, LS, LE, 0.5);
  for (const n of [...g.npcs]) g.removeNPC(n);
  // η πόρτα του σχολείου ανοίγει
  g.phys.remove(g.world.gateBox); g.world.closedSign.visible = false; for (const { piv, sx } of g.world.gates) piv.rotation.y = sx * 1.6;
  const T = P.yardTree, sl = makeSleigh(); sl.position.set(T.x + 7, height(T.x + 7, T.z), T.z + 2); sl.rotation.y = -0.6; g.keep(sl);
  P.reindeer.forEach((_, i) => { const d = g.addNPC(makeReindeer({ rudolph: i === 0, collar: [0xc8102e, 0x2b6cb0, 0x0f7b4b][i] }), T.x + 9 + i * 1.5, T.z + 6 + i * 1.8, -0.6); d.look = { x: T.x, z: T.z }; });
  const kimo = g.addNPC(makeKimolakis(), T.x + 3, T.z + 4, -2.2); kimo.voice = 's'; kimo.look = 'player';
  g.teleport(T.x + 1, T.z + 8, 0); g.p.pitch = 0.1; g.kid.root.visible = !g.inVR;
  g.ui.chapter(c.n, c.title); await g.fadeTo(0, 1.6);
  g.locked = true; kimo.a.st.talk = 20;
  g.cine = { pos: new THREE.Vector3(T.x + 4, height(T.x, T.z) + 2.4, T.z + 13), look: new THREE.Vector3(T.x, height(T.x, T.z) + 4.5, T.z), speed: 1 };
  await g.say([KI('Ξέρεις… κάθε χρόνο στολίζω το δέντρο του σχολείου. Φέτος θέλω να το ανάψεις ΕΣΥ.'), KI('Πες τη μαγική λέξη: «Καλά Χριστούγεννα»!'), K('ΚΑΛΑ ΧΡΙΣΤΟΥΓΕΝΝΑ!')]);
  // το δέντρο ανάβει
  let k = 0; g.tick = (dt) => { k = Math.min(1, k + dt * 0.4); g.world.bigTree.lit(k); g.world.bigTree.star.rotation.y += dt; };
  g.audio.play('../../audio/christmas-sfx.mp3', { vol: 0.8 }); await g.wait(1); confetti(g, { x: T.x, y: height(T.x, T.z) + 6, z: T.z }, 120);
  await g.wait(2.2); kimo.a.st.cheer = 2;
  { const d = new THREE.Vector3(g.p.pos.x - kimo.pos.x, 0, g.p.pos.z - kimo.pos.z).normalize(); g.cine = { pos: new THREE.Vector3(kimo.pos.x + d.x * 3.4 + d.z * 1.2, kimo.pos.y + 1.8, kimo.pos.z + d.z * 3.4 - d.x * 1.2), look: new THREE.Vector3(kimo.pos.x, kimo.pos.y + 1.3, kimo.pos.z), speed: 1.6 }; }
  await g.say([KI('Αυτό είναι για σένα.')]);
  const gold = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.22, 4, 10), new THREE.MeshStandardMaterial({ color: 0xffd36b, metalness: 1, roughness: 0.2, emissive: 0x6a4a00 })); gold.rotation.z = Math.PI / 2;
  const gs = glowSprite('rgba(255,220,120,1)', 1.2); const gx = kimo.pos.x - 1.2, gz = kimo.pos.z + 1.4; gs.position.set(gx, height(gx, gz) + 1.2, gz); g.keep(gs);
  const gi = item(g, gold, gx, height(gx, gz) + 1.2, gz, 'Πάρε τη χρυσή κιμωλία', 2.6); g.tick = (dt, t) => { gold.rotation.y += dt * 2; gold.position.y = height(gx, gz) + 1.2 + Math.sin(t * 2) * 0.08; };
  g.cine = null; g.locked = false; g.ui.objective('Πάρε τη χρυσή κιμωλία');
  await new Promise((r) => { gi.fn = () => { pickup(g, gi); g.scene.remove(gs); r(); }; });
  g.ui.objective(''); g.locked = true;
  await g.say([KI('Η ΧΡΥΣΗ ΚΙΜΩΛΙΑ. Ό,τι γράψεις με αυτήν στον πίνακα… γίνεται λίγο πιο μαγικό.'), KI('Δεν ζήτησες δώρο φέτος. Γι\' αυτό το αξίζεις περισσότερο από όλους.'), KI('Γράψε ιστορίες. Γράψε όσα δεν χωράνε σε κανέναν πίνακα.'), K('Θα τη φυλάω για πάντα. Ευχαριστώ, Κιμωλάκη!'), KI('Εγώ σε ευχαριστώ. Χωρίς εσένα, φέτος δεν θα είχαμε Χριστούγεννα.'), KI('Τώρα πρέπει να φύγω. Πρέπει να γυρίσω στον πίνακα πριν ξημερώσει… αλλιώς η κυρία Ελένη θα αναρωτιέται πού πήγε η κιμωλία της!')]);
  kimo.a.st.wave = 3;
  // απογείωση
  for (const n of [...g.npcs]) g.removeNPC(n);
  const fly = new THREE.Group(); g.keep(fly); fly.position.copy(sl.position); fly.rotation.y = sl.rotation.y; g.scene.remove(sl); fly.add(sl); sl.position.set(0, 0, 0); sl.rotation.set(0, 0, 0);
  const k2 = makeKimolakis(); k2.root.position.set(-0.4, 0.95, -0.5); k2.root.scale.setScalar(0.9); fly.add(k2.root);
  const fd = [0, 1, 2].map((i) => { const d = makeReindeer({ rudolph: i === 0 }); d.root.position.set(i === 0 ? 0 : i === 1 ? -0.8 : 0.8, 0.2, i === 0 ? 7.2 : 4.6); fly.add(d.root); return d; });
  g.cine = { pos: new THREE.Vector3(T.x - 6, height(T.x, T.z) + 3, T.z + 14), look: fly.position.clone(), speed: 1.2 };
  let ft = 0; g.tick = (dt, t) => { ft += dt; fly.position.addScaledVector(new THREE.Vector3(Math.sin(fly.rotation.y), 0, Math.cos(fly.rotation.y)), dt * Math.min(14, ft * 5)); fly.position.y += dt * Math.max(0, ft - 1) * 5; fd.forEach((d, i) => d.update(dt, 4, t + i)); k2.st.wave = 1; k2.update(dt, 0, t); g.cine.look.copy(fly.position); g.world.bigTree.star.rotation.y += dt; if (Math.random() < 0.6) g.splat.burst(fly.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 3, 1); };
  for (let i = 0; i < 6; i++) setTimeout(() => g.audio.bell(1568 + i * 60, 0.25), i * 220);
  await g.say([N('ΟΧΟ-ΧΟ-ΧΟ! ΚΑΛΑ ΧΡΙΣΤΟΥΓΕΝΝΑ!')]); await g.wait(4);
  // ξημέρωμα
  await g.fadeTo(1, 1.4); g.tick = null; g.world.setTime('dawn', 0.01); g.world.setTime('morning', 30); g.world.bigTree.lit(1);
  g.teleport(T.x + 1, T.z + 8, 0); g.cine = { pos: new THREE.Vector3(T.x + 6, height(T.x, T.z) + 2.6, T.z + 14), look: new THREE.Vector3(T.x, height(T.x, T.z) + 2, T.z), speed: 0.6 };
  const presents = new THREE.Group(); for (let i = 0; i < 9; i++) { const p = makeGift(i, 0.5 + (i % 3) * 0.12); p.position.set(Math.cos(i * 0.7) * 2.6, 0, Math.sin(i * 0.7) * 2.6); p.rotation.y = i; presents.add(p); } presents.position.set(T.x, height(T.x, T.z), T.z); g.keep(presents);
  const maria = g.addNPC(makeKid({ coat: 0xff6aa8, girl: true, hat: 0x9b2cff, scarf: 0xffffff, hair: 0x2a1a10 }), 0, P.gate.z + 8, Math.PI); maria.voice = 'm'; const nikos = g.addNPC(makeKid({ coat: 0x0f7b4b, hat: 0xf6c453, scarf: 0xc8102e, hair: 0xd9a15a }), 2, P.gate.z + 9, Math.PI); nikos.voice = 'n';
  maria.speed = nikos.speed = 4.5; maria.target = { x: T.x - 2, z: T.z + 7 }; nikos.target = { x: T.x + 3, z: T.z + 8 }; maria.onArrive = () => { maria.look = 'player'; }; nikos.onArrive = () => { nikos.look = 'player'; };
  await g.fadeTo(0, 2); await g.wait(4);
  await g.say([MA('ΚΑΛΑ ΧΡΙΣΤΟΥΓΕΝΝΑ!!! Εδώ ήσουν;!'), NI('Ξυπνήσαμε και ΟΛΗ η πόλη είχε δώρα! Ακόμα και ο Κύριος Χιονούλης φορούσε καινούργιο σκουφί!'), MA('Κι εμένα μου έφερε ένα τηλεσκόπιο! Για να κοιτάζω τις νιφάδες από κοντά!'), NI('Κι εμένα ένα κράνος χιονοπολέμου. Τώρα είμαι ΑΗΤΤΗΤΟΣ.'), MA('Και το δέντρο του σχολείου… ποιος το άναψε;')]);
  const eleni = g.addNPC(makeKid({ coat: 0x6a2b3b, hat: 0x3a2a4a, scarf: 0xf6c453, hair: 0x3a2416, pants: 0x2a2a3a, girl: true, height: 1.32 }), -2, P.gate.z + 6, Math.PI); eleni.voice = 'e'; eleni.speed = 3; eleni.target = { x: T.x - 4.5, z: T.z + 9 }; eleni.onArrive = () => { eleni.look = 'player'; };
  await g.wait(2.5);
  await g.say([EL('Παιδιά! Δεν θα το πιστέψετε. Οι κιμωλίες γύρισαν όλες στη θέση τους!'), EL('Και στον πίνακα κάποιος έγραψε με πολύ ωραία γράμματα: «Καλά Χριστούγεννα — Κ.»'), MA('Κ.;'), NI('Ποιος είναι ο Κ.;'), K('Ε… έχω μια ιδέα. Αλλά δεν θα με πιστέψετε.'), NI('Τι είναι αυτό που κρατάς; Μια… ΧΡΥΣΗ κιμωλία;'), N('Κάτω από το δέντρο περιμένει ένα τελευταίο δώρο. Το καρτελάκι γράφει το όνομά σου.'), N('Μέσα, ένα κόκκινο ξύλινο ελκηθράκι κι ένα σημείωμα: «Για {τον καλύτερο|την καλύτερη} βοηθό που είχα ποτέ. Τα λέμε του χρόνου! — Κ.»'), K('Θα σας τα πω όλα. Αλλά πρώτα…'), K('ΧΙΟΝΟΠΟΛΕΜΟΣ!!!')]);
  maria.a.st.cheer = nikos.a.st.cheer = g.kid.st.cheer = 3; confetti(g, { x: T.x, y: height(T.x, T.z), z: T.z + 6 }, 100);
  await g.wait(2); g.locked = false; g.cine = null;
  await credits(g);
}

async function credits(g) {
  const roll = [
    ['Τα Χριστούγεννα του Κιμωλάκη', ''], ['Ένα παιχνίδι της εφημερίδας', '«Όσα δεν γράφει ο πίνακας»'],
    ['Πρωταγωνιστούν', 'Εσύ · Ο Κιμωλάκης · Η Μαρία · Ο Νίκος · Η κυρία Ελένη'],
    ['Φωνές', 'Δημιουργήθηκαν με ElevenLabs (elevenlabs.io)'], ['Και οι τάρανδοι', 'Ρούντολφ · Αστραπή · Χιονούλης'], ['Ειδική συμμετοχή', 'Ο Κύριος Χιονούλης'],
    ['Μουσική', 'Το χριστουγεννιάτικο θέμα του osaden.gr'], ['Ευχαριστούμε που έπαιξες!', 'Καλά Χριστούγεννα και καλή χρονιά! 🎄'],
  ];
  const el = document.createElement('div'); el.className = 'credits'; el.innerHTML = roll.map(([a, b]) => `<p><b>${a}</b>${b ? `<span>${b}</span>` : ''}</p>`).join('') + '<p class="end">ΤΕΛΟΣ</p>'; g.root.appendChild(el);
  for (const [a, b] of roll) { g.ui.toast(b ? `${a} — ${b}` : a, 3600); await g.wait(3.8); }
  await g.wait(6); el.remove();
}
