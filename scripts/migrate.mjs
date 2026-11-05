import { neon } from '@neondatabase/serverless';
import { SCHEMA } from '../lib/schema.mjs';
import { DEFAULT_SITE, DEFAULT_PAGES, DEFAULT_CATEGORIES } from '../lib/defaults.mjs';
import { hashPassword } from '../lib/crypto.mjs';

if (!process.env.DATABASE_URL) { console.error('Λείπει το DATABASE_URL (.env.local).'); process.exit(1); }
const sql = neon(process.env.DATABASE_URL);
const run = (text, params = []) => (typeof sql.query === 'function' ? sql.query(text, params) : sql(text, params));
for (const s of SCHEMA) await run(s);
console.log('✓ Πίνακες έτοιμοι');
await run("insert into settings(key,value) values('site',$1::jsonb) on conflict do nothing", [JSON.stringify(DEFAULT_SITE)]);
for (const [slug, sections] of Object.entries(DEFAULT_PAGES())) {
  await run('insert into pages(slug,draft,published) values($1,$2::jsonb,$2::jsonb) on conflict do nothing', [slug, JSON.stringify(sections)]);
}
const exists = (await run('select count(*)::int n from categories'))[0].n;
if (!exists) for (const [i, [name, color]] of DEFAULT_CATEGORIES.entries()) {
  const slug = ['eidiseis', 'scholiki-zoi', 'politismos', 'athlitismos', 'gnomes'][i];
  await run('insert into categories(slug,name,color,sort) values($1,$2,$3,$4) on conflict do nothing', [slug, name, color, i]);
}
console.log('✓ Προεπιλεγμένες ρυθμίσεις και σελίδες');
const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
const users = (await run('select count(*)::int n from users'))[0].n;
if (!users) {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 10) {
    console.error('✗ Ορίστε ADMIN_EMAIL και ADMIN_PASSWORD (≥ 10 χαρακτήρες) για τον πρώτο διαχειριστή.'); process.exit(1);
  }
  await run("insert into users(email,name,password_hash,role) values($1,$2,$3,'admin')", [ADMIN_EMAIL.toLowerCase(), ADMIN_NAME || 'Διαχειριστής', hashPassword(ADMIN_PASSWORD)]);
  console.log('✓ Δημιουργήθηκε ο διαχειριστής', ADMIN_EMAIL, '— αφαιρέστε το ADMIN_PASSWORD από το περιβάλλον.');
} else console.log('• Υπάρχουν ήδη χρήστες, παραλείπεται.');
