import { q, logActivity } from '@/lib/db';
import { route, json, body } from '@/lib/guard';

const RULES = `1. Σεβόμαστε όλους. Χωρίς βρισιές, κοροϊδία, bullying ή ρατσισμό.
2. Δεν δίνουμε ποτέ προσωπικά στοιχεία: διεύθυνση, τηλέφωνο, κωδικούς, φωτογραφίες ή λογαριασμούς σε άλλες εφαρμογές.
3. Δεν δεχόμαστε να βρεθούμε με κάποιον που γνωρίσαμε μόνο online.
4. Γράφουμε στο σωστό κανάλι και δεν κάνουμε spam.
5. Αν κάτι σε ενοχλεί ή σε φοβίζει, πάτα 🚩 Αναφορά και πες το σε έναν γονιό ή καθηγητή.
6. Οι διαχειριστές μπορούν να σβήνουν μηνύματα και να κλείνουν λογαριασμούς που δεν τηρούν τους κανόνες.`;
/** Servers + κανάλια για τη σελίδα συντονισμού. */
export const GET = route(async () => {
  const servers = await q('select id, name, icon, status from chat_servers order by sort, id');
  const channels = await q('select id, server_id, name, readonly from chat_channels order by sort, id');
  return json(servers.map((s) => ({ ...s, channels: channels.filter((c) => c.server_id === s.id) })));
}, { perm: 'community' });
/** Δημιουργία του προεπιλεγμένου server της εφημερίδας (με κανάλια και κανόνες). */
export const POST = route(async (req, _c, user) => {
  const b = await body(req);
  if (b.action !== 'seed') return json({ error: 'Άγνωστη ενέργεια.' }, 400);
  const ex = (await q("select id from chat_servers where slug='osa-den-grafei-o-pinakas'"))[0];
  if (ex) return json({ error: 'Ο προεπιλεγμένος server υπάρχει ήδη.' }, 409);
  const s = (await q(`insert into chat_servers(slug, name, description, icon, color, rules, status, sort) values('osa-den-grafei-o-pinakas', 'Όσα δεν γράφει ο πίνακας', 'Ο επίσημος server της σχολικής μας εφημερίδας: νέα, άρθρα, παιχνίδια και κουβέντα!', '📰', '#2C5E4A', $1, 'draft', 0) returning id`, [RULES]))[0];
  const chans = [['📢-ανακοινώσεις', 'Τα νέα της σύνταξης', true, 0], ['💬-γενικά', 'Η κουβέντα της παρέας', false, 0], ['📰-άρθρα', 'Συζητάμε τα άρθρα της εφημερίδας', false, 0], ['💡-ιδέες', 'Ιδέες για νέα άρθρα και θέματα', false, 10], ['🎮-παιχνίδια', 'Ρεκόρ, κόλπα και παιχνίδια του Κιμωλάκη', false, 0], ['🆘-βοήθεια', 'Ερωτήσεις για τον ιστότοπο', false, 0]];
  let i = 0; for (const [n, t, ro, sm] of chans) await q('insert into chat_channels(server_id, name, topic, readonly, slowmode, sort) values($1,$2,$3,$4,$5,$6)', [s.id, n, t, ro, sm, i++]);
  await logActivity(user, 'Δημιουργία server chat', 'Όσα δεν γράφει ο πίνακας');
  return json({ ok: true, id: s.id }, 201);
}, { perm: 'community' });
