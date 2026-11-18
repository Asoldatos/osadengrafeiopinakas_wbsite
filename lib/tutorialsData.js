import { q } from './db';
/** Δημοσιευμένοι οδηγοί (για τη σελίδα /help και το υποσέλιδο). */
export async function publishedTutorials() {
  try { return await q("select slug, title, subtitle, icon from tutorials where status='published' order by sort asc, id asc"); } catch { return []; }
}
/** Ένας οδηγός. Οι πρόχειροι επιστρέφονται μόνο όταν το ζητά διαχειριστής (προεπισκόπηση). */
export async function getTutorial(slug, { includeDrafts = false } = {}) {
  try {
    const r = await q(`select * from tutorials where slug=$1 ${includeDrafts ? '' : "and status='published'"}`, [String(slug).slice(0, 200)]);
    return r[0] || null;
  } catch { return null; }
}
