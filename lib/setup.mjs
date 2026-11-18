// Δημιουργία/ενημέρωση της βάσης δεδομένων. Χρησιμοποιείται από το `npm run db:setup` ΚΑΙ αυτόματα από τον ιστότοπο
// όταν εντοπίσει ότι λείπει πίνακας ή στήλη (π.χ. μετά από ενημέρωση χωρίς db:setup).
import { SCHEMA } from './schema.mjs';
import { DEFAULT_TUTORIALS } from './tutorials.mjs';
import { DEFAULT_SITE, DEFAULT_PAGES, DEFAULT_CATEGORIES } from './defaults.mjs';
import { QUIZ, WORDS, ADVENTURES } from './seed.mjs';
import { DEFAULT_THEMES, christmasDefaults } from './themes.mjs';
import { presetPerms, EDITOR_PRESET, allExceptAdmins } from './perms.mjs';
import { DEFAULT_SITE_URL } from './siteurl.mjs';

export async function ensureSchema(run) { for (const s of SCHEMA) await run(s); }

/** Λογαριασμοί διαχειριστών: ο πρώτος διαχειριστής γίνεται Superadmin («Angel») και οι υπάρχοντες λογαριασμοί παίρνουν δικαιώματα που αντιστοιχούν στον μέχρι τώρα ρόλο τους. */
export async function backfillUsers(run) {
  if (!(await run("select count(*)::int n from users where role='superadmin'"))[0].n) {
    await run("update users set role='superadmin' where id=(select min(id) from users where role='admin')");
    await run("update users set name='Angel' where role='superadmin' and (name='' or name='Διαχειριστής')");
  }
  const taken = (await run("select count(*)::int n from users where lower(username)='angel'"))[0].n;
  await run(`update users set username=${taken ? "lower(regexp_replace(split_part(email,'@',1),'[^A-Za-z0-9._-]','','g'))" : "'angel'"} where role='superadmin' and username is null`);
  await run("update users set permissions=$1::jsonb where role='editor' and permissions='{}'::jsonb", [JSON.stringify(presetPerms(EDITOR_PRESET))]);
  await run("update users set permissions=$1::jsonb where role='admin' and permissions='{}'::jsonb", [JSON.stringify(allExceptAdmins())]);
}
/** Εποχιακά θέματα και το χριστουγεννιάτικο ενημερωτικό (προγραμματισμένο για 23 Δεκεμβρίου, 08:00 ώρα Ελλάδας· επεξεργάσιμο μέχρι τότε). */
export async function seedThemes(run, log = () => {}) {
  for (const t of DEFAULT_THEMES()) await run('insert into themes(slug,name,mode,config) values($1,$2,$3,$4::jsonb) on conflict do nothing', [t.slug, t.name, t.mode, JSON.stringify(t.config)]);
  if (!(await run("select count(*)::int n from campaigns where theme_slug='christmas'"))[0].n) {
    const d = christmasDefaults(), y = d.schedule.activateFrom.slice(0, 4), when = new Date(`${y}-12-23T06:00:00.000Z`);
    const future = when.getTime() > Date.now() + 60000;
    await run(`insert into campaigns(subject, preheader, body_html, mascot_mood, mascot_text, cta_label, cta_url, include_articles, article_count, status, theme_slug, scheduled_at,
        header_image, activation_enabled, activation_label, activation_message, buttons) values($1,$2,$3,'celebrate',$4,$5,$6,true,3,$7,'christmas',$8,'',true,$9,$10,$11::jsonb)`, [
      '🎄 Καλά Χριστούγεννα από τον Κιμωλάκη!', 'Μια χριστουγεννιάτικη έκπληξη σε περιμένει στην εφημερίδα μας.',
      '<h2>Καλά Χριστούγεννα!</h2><p>Η ομάδα της εφημερίδας σου εύχεται <strong>καλές γιορτές</strong>, γεμάτες χαρά, ζεστασιά και καλά βιβλία.</p><p>Ετοιμάσαμε μια ξεχωριστή έκπληξη: ο ιστότοπός μας γίνεται χριστουγεννιάτικος και ο Κιμωλάκης μεταμορφώνεται σε Άγιο Βασίλη!</p>',
      'Χο χο χο! Πάτα το κόκκινο κουμπί και δες τι ετοίμασα!', 'Επισκέψου την εφημερίδα', DEFAULT_SITE_URL, future ? 'scheduled' : 'draft', future ? when.toISOString() : null,
      '🎄 ΕΝΕΡΓΟΠΟΙΗΣΗ ΧΡΙΣΤΟΥΓΕΝΝΙΑΤΙΚΗΣ ΛΕΙΤΟΥΡΓΙΑΣ 🎄', d.texts.activationMessage, JSON.stringify([{ label: 'Δες τα τεύχη', url: DEFAULT_SITE_URL + '/editions' }])]);
    log(future ? `✓ Χριστουγεννιάτικο ενημερωτικό προγραμματισμένο για ${when.toISOString()}` : '✓ Χριστουγεννιάτικο ενημερωτικό (πρόχειρο)');
  }
  log('✓ Εποχιακά θέματα');
}
export async function seedDefaults(run, log = () => {}) {
  await run("insert into settings(key,value) values('site',$1::jsonb) on conflict do nothing", [JSON.stringify(DEFAULT_SITE)]);
  for (const [slug, sections] of Object.entries(DEFAULT_PAGES())) await run('insert into pages(slug,draft,published) values($1,$2::jsonb,$2::jsonb) on conflict do nothing', [slug, JSON.stringify(sections)]);
  if (!(await run('select count(*)::int n from categories'))[0].n) {
    for (const [i, [name, color]] of DEFAULT_CATEGORIES.entries()) await run('insert into categories(slug,name,color,sort) values($1,$2,$3,$4) on conflict do nothing', [['eidiseis', 'scholiki-zoi', 'politismos', 'athlitismos', 'gnomes'][i], name, color, i]);
  }
  log('✓ Προεπιλεγμένες ρυθμίσεις και σελίδες');
  if (!(await run('select count(*)::int n from quiz_questions'))[0].n) for (const [q, o, c, e] of QUIZ) await run('insert into quiz_questions(question,options,correct_no,explanation) values($1,$2::jsonb,$3,$4)', [q, JSON.stringify(o), c, e]);
  if (!(await run('select count(*)::int n from words'))[0].n) for (const [w, h] of WORDS) await run('insert into words(word,hint) values($1,$2)', [w, h]);
  if (!(await run('select count(*)::int n from adventures'))[0].n) for (const a of ADVENTURES) await run("insert into adventures(slug,title,description,unlock_level,xp_reward,status,sort,scenes) values($1,$2,$3,$4,$5,'published',$6,$7::jsonb)", [a.slug, a.title, a.description, a.unlock_level, a.xp_reward, a.sort, JSON.stringify(a.scenes)]);
  log('✓ Παιχνίδια, κουίζ και περιπέτειες');
  await backfillUsers(run);
  // Οδηγοί βοήθειας: μπαίνουν ΜΙΑ φορά (σημάδι στις ρυθμίσεις), ώστε να μην ξαναεμφανίζονται αν τους σβήσεις
  if ((await run("insert into settings(key,value) values('tutorials_seeded','true'::jsonb) on conflict do nothing returning key")).length) {
    for (const t of DEFAULT_TUTORIALS) await run('insert into tutorials(slug,title,subtitle,icon,intro,blocks,outro,status,sort) values($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9) on conflict do nothing',
      [t.slug, t.title, t.subtitle, t.icon, t.intro, JSON.stringify(t.blocks), t.outro, t.status, t.sort]);
    log('✓ Οδηγοί βοήθειας');
  }
  await seedThemes(run, log);
  const cur = (await run("select value from settings where key='site'"))[0];
  if (cur && Array.isArray(cur.value.footer?.extraLinks) && !cur.value.footer.extraLinks.some((l) => l.href === '/email-help')) {
    cur.value.footer.extraLinks.push({ label: 'Δεν βλέπεις τα email μας;', href: '/email-help' });
    await run("update settings set value=$1::jsonb where key='site'", [JSON.stringify(cur.value)]);
    log('✓ Προστέθηκε ο οδηγός email στο υποσέλιδο');
  }
  const site = (await run("select value from settings where key='site'"))[0];
  if (site && Array.isArray(site.value.nav) && !site.value.nav.some((n) => n.href === '/play')) {
    const i = site.value.nav.findIndex((n) => n.href === '/articles');
    site.value.nav.splice(i + 1, 0, { label: 'Παιχνίδια', href: '/play', visible: true });
    await run("update settings set value=$1::jsonb where key='site'", [JSON.stringify(site.value)]);
    log('✓ Προστέθηκε το «Παιχνίδια» στο μενού');
  }
}
