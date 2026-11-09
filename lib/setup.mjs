// Δημιουργία/ενημέρωση της βάσης δεδομένων. Χρησιμοποιείται από το `npm run db:setup` ΚΑΙ αυτόματα από τον ιστότοπο
// όταν εντοπίσει ότι λείπει πίνακας ή στήλη (π.χ. μετά από ενημέρωση χωρίς db:setup).
import { SCHEMA } from './schema.mjs';
import { DEFAULT_SITE, DEFAULT_PAGES, DEFAULT_CATEGORIES } from './defaults.mjs';
import { QUIZ, WORDS, ADVENTURES } from './seed.mjs';

export async function ensureSchema(run) { for (const s of SCHEMA) await run(s); }

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
  const site = (await run("select value from settings where key='site'"))[0];
  if (site && Array.isArray(site.value.nav) && !site.value.nav.some((n) => n.href === '/play')) {
    const i = site.value.nav.findIndex((n) => n.href === '/articles');
    site.value.nav.splice(i + 1, 0, { label: 'Παιχνίδια', href: '/play', visible: true });
    await run("update settings set value=$1::jsonb where key='site'", [JSON.stringify(site.value)]);
    log('✓ Προστέθηκε το «Παιχνίδια» στο μενού');
  }
}
