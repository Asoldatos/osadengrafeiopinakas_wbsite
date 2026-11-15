import { revalidatePath } from 'next/cache';
import { q, logActivity } from '@/lib/db';
import { route, json, body } from '@/lib/guard';
import { christmasDefaults, cleanThemeConfig, themeAvailability } from '@/lib/themes.mjs';

const defaultsFor = (slug) => (slug === 'christmas' ? christmasDefaults() : null);
async function row(slug) { const r = (await q('select slug, name, mode, config, updated_at from themes where slug=$1', [slug]))[0]; if (!r) throw json({ error: 'Δεν βρέθηκε το θέμα.' }, 404); return r; }

export const GET = route(async (_req, { params }) => {
  const r = await row(params.slug), d = defaultsFor(params.slug);
  const config = cleanThemeConfig(r.config, d || r.config);
  const stats = (await q('select count(*)::int people, coalesce(sum(count),0)::int clicks from theme_activations where theme=$1 and subscriber_id<>0', [params.slug]))[0];
  return json({ ...r, config, defaults: d, availability: themeAvailability({ ...r, config }), stats });
}, { perm: 'themes' });

export const PUT = route(async (req, { params }, user) => {
  const r = await row(params.slug), b = await body(req), d = defaultsFor(params.slug) || r.config;
  const mode = ['off', 'auto', 'on'].includes(b.mode) ? b.mode : r.mode;
  const config = b.reset === true ? d : cleanThemeConfig(b.config ?? r.config, d);
  await q('update themes set mode=$2, config=$3::jsonb, updated_at=now() where slug=$1', [params.slug, mode, JSON.stringify(config)]);
  revalidatePath('/', 'layout');
  await logActivity(user, b.reset === true ? 'Επαναφορά εποχιακού θέματος' : 'Αλλαγή εποχιακού θέματος', `${r.name}: λειτουργία ${mode}`);
  return json({ ok: true, mode, config, availability: themeAvailability({ mode, config }) });
}, { perm: 'themes' });
