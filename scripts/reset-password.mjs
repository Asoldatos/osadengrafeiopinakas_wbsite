import { neon } from '@neondatabase/serverless';
import { hashPassword } from '../lib/crypto.mjs';
const [email, pw] = process.argv.slice(2);
if (!email || !pw || pw.length < 10) { console.error('Χρήση: npm run reset-password -- email@example.gr "νέος-κωδικός-≥10-χαρακτήρων"'); process.exit(1); }
const sql = neon(process.env.DATABASE_URL);
const run = (text, params = []) => (typeof sql.query === 'function' ? sql.query(text, params) : sql(text, params));
const r = await run('update users set password_hash=$1 where email=$2 returning id', [hashPassword(pw), email.toLowerCase()]);
if (!r.length) { console.error('Δεν βρέθηκε χρήστης.'); process.exit(1); }
await run('delete from sessions where user_id=$1', [r[0].id]);
console.log('✓ Ο κωδικός άλλαξε και όλες οι συνεδρίες έκλεισαν.');
