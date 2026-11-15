import { cache } from 'react';
import { q } from './db';
import { christmasDefaults, cleanThemeConfig, themeAvailability, DEFAULT_THEMES } from './themes.mjs';

/** Όλα τα εποχιακά θέματα, με τις ρυθμίσεις τους συμπληρωμένες από τις προεπιλογές (νέα πεδία δεν «σπάνε» παλιές εγγραφές). */
export const getThemes = cache(async () => {
  try {
    const rows = await q('select slug, name, mode, config, updated_at from themes order by slug');
    return rows.map((r) => ({ ...r, config: cleanThemeConfig(r.config, r.slug === 'christmas' ? christmasDefaults() : r.config) }));
  } catch (e) { console.error('Θέματα:', e.message); return DEFAULT_THEMES().map((t) => ({ ...t, mode: 'off' })); }
});
export async function getTheme(slug) { return (await getThemes()).find((t) => t.slug === slug) || null; }
/** Το θέμα που είναι διαθέσιμο τώρα (αν υπάρχει). */
export async function getAvailableTheme(now = new Date()) {
  for (const t of await getThemes()) if (themeAvailability(t, now).available) return t;
  return null;
}
