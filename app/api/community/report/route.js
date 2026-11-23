import { q } from '@/lib/db';
import { json, body } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { cleanText } from '@/lib/sanitize';
import { pair } from '@/lib/community.mjs';
import { countSince } from '@/lib/communityServer';
import { alertStaff } from '@/lib/tickets';

const REASONS = { bully: 'Με ενοχλεί / με προσβάλλει', unsafe: 'Μου ζητάει προσωπικά στοιχεία ή να βρεθούμε', adult: 'Ακατάλληλο περιεχόμενο', spam: 'Spam', other: 'Άλλο' };
/** Αναφορά συνομιλίας. Κρατάμε αντίγραφο των τελευταίων 50 μηνυμάτων ώστε ο διαχειριστής να το δει ακόμη κι αν σβηστούν. */
export const POST = sroute(async (req, _c, st) => {
  const b = await body(req), other = +b.id || 0;
  if (!other || other === st.id) return json({ error: 'Μη έγκυρη αναφορά.' }, 400);
  if (await countSince("select count(*)::int n from dm_reports where reporter=$1 and created_at > now() - interval '1 day'", [st.id]) >= 5) return json({ error: 'Έστειλες αρκετές αναφορές σήμερα. Αν κινδυνεύεις, μίλησε αμέσως σε έναν ενήλικα που εμπιστεύεσαι.' }, 429);
  const [a, bb] = pair(st.id, other);
  // Κρυπτογραφημένα DM: ο διακομιστής δεν μπορεί να τα διαβάσει, οπότε τα στέλνει αποκρυπτογραφημένα η συσκευή του μαθητή που κάνει την αναφορά.
  let snap = (await q("select m.sender, s.nickname, m.body, m.created_at from dm_messages m join students s on s.id=m.sender where m.a=$1 and m.b=$2 and m.enc is null and m.body<>'' order by m.id desc limit 50", [a, bb])).reverse();
  let fromDevice = false;
  if (Array.isArray(b.snapshot) && b.snapshot.length) {
    const names = Object.fromEntries((await q('select id, nickname from students where id = any($1::int[])', [[st.id, other]])).map((r) => [r.id, r.nickname]));
    snap = b.snapshot.slice(-50).map((m) => ({ sender: m.mine ? st.id : other, nickname: names[m.mine ? st.id : other], body: cleanText(m.body, 2000), created_at: m.at })).filter((m) => m.body);
    fromDevice = true;
  }
  const reason = REASONS[b.reason] ? b.reason : 'other';
  const detail = cleanText(b.detail, 1000).trim();
  await q('insert into dm_reports(reporter, reported, reason, snapshot) values($1,$2,$3,$4::jsonb)', [st.id, other, `${REASONS[reason]}${detail ? ' — ' + detail : ''}${fromDevice ? ' [🔒 κρυπτογραφημένη συνομιλία: τα μηνύματα τα έστειλε η συσκευή του μαθητή που έκανε την αναφορά]' : ''}`, JSON.stringify(snap)]);
  if (b.block) { await q('delete from friendships where a=$1 and b=$2', [a, bb]); await q('insert into blocks(blocker, blocked) values($1,$2) on conflict do nothing', [st.id, other]); }
  // ειδοποίηση της σύνταξης (χωρίς τα μηνύματα στο email: τα βλέπει μόνο στον πίνακα)
  await alertStaff(`Αναφορά συνομιλίας: ${REASONS[reason]}`, 'Ένας μαθητής ανέφερε μια συνομιλία. Δες τη στον πίνακα διαχείρισης → Κοινότητα → Αναφορές.', '/editor-panel/community?tab=reports');
  return json({ ok: true });
});
