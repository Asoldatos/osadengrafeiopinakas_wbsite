#!/usr/bin/env node
// Φτιάχνει τις φωνές του 3D παιχνιδιού με ElevenLabs. Τρέχει ΜΟΝΟ στον υπολογιστή σου — το κλειδί δεν μπαίνει ποτέ στο site.
//
//   node scripts/tts-voices.mjs voices          → λίστα με τις φωνές του λογαριασμού σου (όνομα + voice_id)
//   node scripts/tts-voices.mjs plan            → πόσες ατάκες / χαρακτήρες χρειάζονται, τι λείπει
//   node scripts/tts-voices.mjs make            → φτιάχνει ό,τι λείπει (σταματά ευγενικά όταν τελειώσουν τα credits)
//   node scripts/tts-voices.mjs make --max 9000 → το πολύ 9000 χαρακτήρες σε αυτή την εκτέλεση
//   node scripts/tts-voices.mjs make --only s   → μόνο ένας χαρακτήρας (k-m, k-f, m, n, s, e, mom, x)
//   node scripts/tts-voices.mjs redo <hash>     → ξαναφτιάχνει μία ατάκα που δεν σου άρεσε
//   node scripts/tts-voices.mjs preview s       → δείχνει τι ακριβώς θα πει κάθε φωνή (χωρίς credits)
//
// Το κλειδί διαβάζεται από τη μεταβλητή ELEVENLABS_API_KEY ή από το αρχείο .env.local (ΔΕΝ ανεβαίνει στο git).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GAME = path.join(ROOT, 'public', 'game', 'xmas');
const OUT = path.join(GAME, 'voice');
const CFG = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'tts-voices.config.json'), 'utf8'));
const NAMES = { 'k-m': 'Εσύ (αγόρι)', 'k-f': 'Εσύ (κορίτσι)', m: 'Μαρία', n: 'Νίκος', s: 'Κιμωλάκης', e: 'Κυρία Ελένη', mom: 'Μαμά (σημείωμα)', x: 'Αφηγητής' };
const HELPERS = { K: 'k', MA: 'm', NI: 'n', KI: 's', EL: 'e', MO: 'mom', N: 'x' };

// ίδιος hash με το voice.js
const vhash = (str) => { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };
const unescape = (s) => s.replace(/\\(.)/g, (_, c) => ({ n: '\n', t: '\t' })[c] ?? c);
const gender = (t, gd) => t.replace(/\{([^|}]*)\|([^}]*)\}/g, (_, m, f) => (gd === 'f' ? f : m));

/** Βρίσκει όλες τις ατάκες στο story.js (K('…'), MA('…'), …). */
function collect() {
  const src = fs.readFileSync(path.join(GAME, 'story.js'), 'utf8'), out = new Map();
  const re = /\b(K|MA|NI|KI|EL|MO|N)\(\s*'((?:[^'\\]|\\.)*)'\s*\)/g; let m;
  while ((m = re.exec(src))) {
    const raw = unescape(m[2]), c = HELPERS[m[1]];
    for (const gd of ['m', 'f']) {
      const text = gender(raw, gd), sp = c === 'k' ? `k-${gd}` : c, h = vhash(sp + '|' + text);
      if (!out.has(h)) out.set(h, { h, sp, text });
    }
  }
  return [...out.values()];
}
/** Το κείμενο που θα ΠΕΙ η φωνή (το κείμενο στην οθόνη μένει ίδιο). */
function spoken(text) {
  let t = text.replace(/[«»]/g, '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}♥️]/gu, '').replace(/^\((.*)\)$/s, '$1');
  // ολόκληρες λέξεις μόνο (π.χ. το «ΤΟΥ» να μην αλλάζει μέσα στο «ΧΡΙΣΤΟΥΓΕΝΝΑ»), οι μεγαλύτερες φράσεις πρώτες
  const L = '[A-Za-z\\u0370-\\u03FF\\u1F00-\\u1FFF]';
  for (const [a, b] of Object.entries(CFG.say || {}).sort((x, y) => y[0].length - x[0].length)) t = t.replace(new RegExp(`(?<!${L})${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?!${L})`, 'gu'), b);
  return t.replace(/\s+/g, ' ').trim();
}
function key() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY.trim();
  for (const f of ['.env.local', '.env']) { try { const m = fs.readFileSync(path.join(ROOT, f), 'utf8').match(/^\s*ELEVENLABS_API_KEY\s*=\s*"?([^"\r\n]+)"?/m); if (m) return m[1].trim(); } catch {} }
  console.error('\n✖ Δεν βρέθηκε κλειδί. Βάλε στο .env.local τη γραμμή:\n  ELEVENLABS_API_KEY=το_κλειδί_σου\n'); process.exit(1);
}
const exists = (h) => fs.existsSync(path.join(OUT, h + '.mp3'));
function writeManifest(lines) {
  const have = lines.filter((l) => exists(l.h)).map((l) => l.h).sort();
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ model: CFG.model, lines: have }) + '\n');
  return have.length;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tts(k, line) {
  const v = CFG.voices[line.sp]; if (!v?.id || v.id.startsWith('ΒΑΛΕ')) throw Object.assign(new Error(`Δεν έχεις ορίσει voice_id για «${NAMES[line.sp]}» (${line.sp}) στο tts-voices.config.json`), { fatal: true });
  const body = { text: spoken(line.text), model_id: CFG.model, voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true, ...(v.settings || {}) } };
  for (let tryN = 0; tryN < 4; tryN++) {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${v.id}?output_format=mp3_44100_128`, { method: 'POST', headers: { 'xi-api-key': k, 'content-type': 'application/json', accept: 'audio/mpeg' }, body: JSON.stringify(body) });
    if (r.ok) return Buffer.from(await r.arrayBuffer());
    const txt = await r.text(); let det = txt; try { det = JSON.parse(txt).detail; } catch {}
    const status = typeof det === 'object' ? det?.status || det?.code : '';
    if (r.status === 429 || r.status >= 500) { const w = 2000 * (tryN + 1); console.log(`   … ο server είναι απασχολημένος, ξαναδοκιμάζω σε ${w / 1000}″`); await sleep(w); continue; }
    if (/quota|credit|limit/i.test(String(status) + txt)) throw Object.assign(new Error('Τελείωσαν τα credits του μήνα. Ό,τι φτιάχτηκε σώθηκε — ξανατρέξε το «make» όταν ανανεωθούν και θα συνεχίσει από εκεί που σταμάτησε.'), { fatal: true });
    if (r.status === 401) throw Object.assign(new Error('Λάθος ή ανενεργό κλειδί (401). Έλεγξε το ELEVENLABS_API_KEY.'), { fatal: true });
    throw Object.assign(new Error(`HTTP ${r.status}: ${typeof det === 'object' ? JSON.stringify(det) : det}`), { fatal: r.status === 400 || r.status === 403 || r.status === 422 });
  }
  throw new Error('Πολλές αποτυχίες στη σειρά.');
}

const [cmd = 'plan', ...args] = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
fs.mkdirSync(OUT, { recursive: true });
const lines = collect();

if (cmd === 'voices') {
  const r = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': key() } });
  if (!r.ok) { console.error('✖', r.status, await r.text()); process.exit(1); }
  const { voices } = await r.json();
  console.log('\nΟι φωνές του λογαριασμού σου (αντέγραψε το voice_id στο scripts/tts-voices.config.json):\n');
  for (const v of voices) console.log(`  ${v.voice_id}   ${v.name.padEnd(28)} ${Object.values(v.labels || {}).join(', ')}`);
} else if (cmd === 'plan') {
  const by = {};
  for (const l of lines) { const b = (by[l.sp] ||= { n: 0, chars: 0, miss: 0, missChars: 0 }); const c = spoken(l.text).length; b.n++; b.chars += c; if (!exists(l.h)) { b.miss++; b.missChars += c; } }
  let T = 0, M = 0; console.log('\nΧαρακτήρας              ατάκες   χαρακτήρες   λείπουν (χαρ.)');
  for (const [sp, b] of Object.entries(by)) { T += b.chars; M += b.missChars; console.log(`  ${(NAMES[sp] || sp).padEnd(22)} ${String(b.n).padStart(5)}   ${String(b.chars).padStart(9)}   ${String(b.miss).padStart(5)} (${b.missChars})`); }
  console.log(`\n  Σύνολο: ${lines.length} αρχεία, ${T} χαρακτήρες · λείπουν ${M} χαρακτήρες.`);
  const caps = new Set(); for (const l of lines) for (const w of spoken(l.text).match(/(?<![Α-Ωα-ω])[Α-ΩΪΫ]{3,}/g) || []) caps.add(w);
  if (caps.size) console.log(`\n  Λέξεις με ΚΕΦΑΛΑΙΑ χωρίς τόνο (πρόσθεσέ τες στο "say" του config αν η φωνή τις προφέρει λάθος):\n  ${[...caps].join(', ')}`);
  console.log(`\n  Ήδη φτιαγμένα: ${writeManifest(lines)}`);
} else if (cmd === 'make' || cmd === 'redo') {
  const k = key(), max = Number(opt('max', Infinity)), only = opt('only', null);
  let todo = cmd === 'redo' ? lines.filter((l) => args.includes(l.h)) : lines.filter((l) => !exists(l.h) && (!only || l.sp === only));
  // πρώτα οι χαρακτήρες με τα λιγότερα λόγια, ώστε να ακούγονται «όλοι» από νωρίς
  let used = 0, made = 0; console.log(`\nΠρος δημιουργία: ${todo.length} ατάκες · μοντέλο ${CFG.model}\n`);
  for (const l of todo) {
    const c = spoken(l.text).length; if (used + c > max) { console.log(`\n■ Έφτασα το όριο --max ${max}.`); break; }
    try { const mp3 = await tts(k, l); fs.writeFileSync(path.join(OUT, l.h + '.mp3'), mp3); used += c; made++; console.log(`  ✓ ${l.h}  ${(NAMES[l.sp] || l.sp).padEnd(16)} ${l.text.slice(0, 70)}`); }
    catch (e) { console.error(`  ✖ ${l.h}  ${e.message}`); if (e.fatal) break; }
    await sleep(250);
  }
  const n = writeManifest(lines); console.log(`\nΈτοιμο: ${made} νέα αρχεία (${used} χαρακτήρες). Σύνολο στο παιχνίδι: ${n}/${lines.length}.`);
  console.log('Μην ξεχάσεις: git add public/game/xmas/voice && git commit && git push');
} else if (cmd === 'preview') {
  for (const l of lines.filter((l) => !args[0] || l.sp === args[0])) console.log(`${l.h}  ${(NAMES[l.sp] || l.sp).padEnd(16)} ${spoken(l.text)}`);
} else console.log('Εντολές: voices | plan | make [--max N] [--only sp] | redo <hash> | preview [sp]');
