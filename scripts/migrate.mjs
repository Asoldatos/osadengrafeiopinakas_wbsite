import { neon } from '@neondatabase/serverless';
import { hashPassword } from '../lib/crypto.mjs';
import { ensureSchema, seedDefaults } from '../lib/setup.mjs';

if (!process.env.DATABASE_URL) { console.error('Λείπει το DATABASE_URL (.env.local).'); process.exit(1); }
const sql = neon(process.env.DATABASE_URL);
const run = (text, params = []) => (typeof sql.query === 'function' ? sql.query(text, params) : sql(text, params));
await ensureSchema(run);
console.log('✓ Πίνακες έτοιμοι');
await seedDefaults(run, console.log);
const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
const users = (await run('select count(*)::int n from users'))[0].n;
if (!users) {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 10) {
    console.error('✗ Ορίστε ADMIN_EMAIL και ADMIN_PASSWORD (≥ 10 χαρακτήρες) για τον πρώτο διαχειριστή.'); process.exit(1);
  }
  await run("insert into users(email,name,password_hash,role) values($1,$2,$3,'admin')", [ADMIN_EMAIL.toLowerCase(), ADMIN_NAME || 'Διαχειριστής', hashPassword(ADMIN_PASSWORD)]);
  console.log('✓ Δημιουργήθηκε ο διαχειριστής', ADMIN_EMAIL, '— αφαιρέστε το ADMIN_PASSWORD από το περιβάλλον.');
} else console.log('• Υπάρχουν ήδη χρήστες, παραλείπεται.');
console.log('✓ Η βάση δεδομένων είναι ενημερωμένη.');
