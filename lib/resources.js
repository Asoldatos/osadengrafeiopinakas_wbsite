import { slugify } from './util';
import { cleanHtml, cleanText } from './sanitize';
import { normalizeGreek } from './games.mjs';
import { AVATARS } from './progress.mjs';

const T = (v) => (v == null || v === '' ? '' : cleanText(v, 500));
const TN = (v) => (v == null || v === '' ? null : cleanText(v, 1000));
const L = (v) => cleanText(v, 20000);
const H = (v) => cleanHtml(v);
const I = (v) => (v === '' || v == null || isNaN(+v) ? null : Math.trunc(+v));
const I0 = (v) => (isNaN(+v) ? 0 : Math.trunc(+v));
const B = (v) => v === true || v === 'true' || v === 1;
const F = (v) => Math.min(1, Math.max(0, +v || 0));
const D = (v) => { if (!v) return null; const d = new Date(v); return isNaN(d) ? null : d.toISOString(); };
const DD = (v) => { if (!v) return null; const d = new Date(v); return isNaN(d) ? null : d.toISOString().slice(0, 10); };
const ST = (v) => (['draft', 'published', 'archived'].includes(v) ? v : 'draft');
const arr = (max, f = (x) => cleanText(x, 1000)) => (v) => (Array.isArray(v) ? v.slice(0, max).map(f) : []);
const LINKS = (v) => (Array.isArray(v) ? v.slice(0, 30).map((l) => ({ label: cleanText(l?.label, 200), url: cleanText(l?.url, 1000) })) : []);
const J = (v) => (v && typeof v === 'object' ? v : {});
const CFG = (v) => {
  const o = {}; if (!v || typeof v !== 'object') return o;
  for (const [k, x] of Object.entries(v).slice(0, 12)) {
    if (k === 'html') o[k] = cleanHtml(x);
    else if (k === 'images') o[k] = Array.isArray(x) ? x.slice(0, 40).map((i) => cleanText(i, 1000)) : [];
    else o[cleanText(k, 30)] = cleanText(x, 5000);
  } return o;
};
const HT = ['link', 'article', 'video', 'audio', 'gallery', 'text', 'game', 'custom'];

const MOODS = ['happy', 'wave', 'celebrate', 'reading', 'confused', 'phone', 'work', 'oops'];
const SCENES = (v) => (Array.isArray(v) ? v.slice(0, 60).map((s) => ({
  id: cleanText(s?.id, 30).replace(/[^a-zA-Z0-9_-]/g, ''), title: cleanText(s?.title, 120), text: cleanText(s?.text, 3000), mood: MOODS.includes(s?.mood) ? s.mood : 'happy',
  end: s?.end === true, endingTitle: cleanText(s?.endingTitle, 120),
  choices: Array.isArray(s?.choices) ? s.choices.slice(0, 5).map((c) => ({ label: cleanText(c?.label, 140), to: cleanText(c?.to, 30).replace(/[^a-zA-Z0-9_-]/g, '') })) : [],
})) : []);
const WORD = (v) => normalizeGreek(v).replace(/[^Α-Ω]/g, '').slice(0, 14);
const NUMR = (a, b) => (v) => Math.min(b, Math.max(a, Math.trunc(+v) || 0));
const OPTS = (v) => (Array.isArray(v) ? v.slice(0, 4).map((x) => cleanText(x, 200).trim()) : []);
const jsonb = (c) => ({ c, json: true });
const col = (c) => ({ c });

export const RES = {
  articles: {
    table: 'articles', slug: true, titleCol: 'title', order: 't.created_at desc',
    select: `t.*, w.name as author_name, c.name as category_name from articles t
             left join authors w on w.id=t.author_id left join categories c on c.id=t.category_id`,
    cols: { title: col(T), subtitle: col(T), slug: col(T), content: col(H), cover_url: col(TN), author_id: col(I), category_id: col(I), tags: jsonb(arr(20, (x) => cleanText(x, 40))), featured: col(B), status: col(ST), publish_at: col(D), gallery: jsonb(arr(40)), videos: jsonb(arr(10)), links: jsonb(LINKS), seo_title: col(T), seo_desc: col(T) },
    touch: true,
  },
  editions: {
    table: 'editions', slug: true, titleCol: 'title', order: 't.pub_date desc nulls last, t.created_at desc',
    select: 't.* from editions t',
    cols: { title: col(T), slug: col(T), cover_url: col(TN), pub_date: col(DD), school_year: col(T), description: col(L), digital_pdf_url: col(TN), print_pdf_url: col(TN), digital_public: col(B), print_public: col(B), status: col(ST), featured: col(B) },
    touch: true,
  },
  writers: {
    table: 'authors', titleCol: 'name', order: 't.sort asc, t.id asc', select: 't.* from authors t',
    cols: { name: col(T), role: col(T), bio: col(L), photo_url: col(TN), sort: col(I0), visible: col(B) },
  },
  categories: {
    table: 'categories', slug: true, titleCol: 'name', order: 't.sort asc, t.name asc', select: 't.* from categories t',
    cols: { name: col(T), slug: col(T), color: col(T), description: col(T), sort: col(I0) },
  },
  hotspots: {
    table: 'hotspots', titleCol: null, order: 't.page_no asc, t.id asc', select: 't.* from hotspots t', filter: ['edition_id'],
    cols: { edition_id: col(I), page_no: col(I0), x: col(F), y: col(F), w: col(F), h: col(F), type: col((v) => (HT.includes(v) ? v : 'link')), icon: col(T), label: col(T), config: jsonb(CFG) },
  },
  students: {
    table: 'students', titleCol: 'nickname', order: 't.created_at desc', noCreate: true, adminOnly: true,
    select: 't.id, t.email, t.nickname, t.avatar, t.verified, t.disabled, t.xp, t.created_at, t.last_login from students t',
    cols: { disabled: col(B) },
  },
  subscribers: {
    table: 'subscribers', titleCol: 'email', order: 't.created_at desc', noCreate: true, adminOnly: true,
    select: 't.id, t.email, t.name, t.status, t.source, t.created_at, t.confirmed_at, t.unsub_at from subscribers t',
    cols: { name: col(T), status: col((v) => (['pending', 'active', 'unsubscribed'].includes(v) ? v : 'pending')) },
  },
  campaigns: {
    table: 'campaigns', titleCol: 'subject', order: 't.id desc', touch: true, adminOnly: true, select: 't.* from campaigns t',
    cols: { subject: col(T), preheader: col(T), body_html: col(H), mascot_mood: col((v) => (MOODS.includes(v) ? v : 'wave')), mascot_text: col(T), cta_label: col(T), cta_url: col(T), include_articles: col(B), article_count: col(NUMR(0, 6)) },
    validate: (d) => ('cta_url' in d && d.cta_url && !/^https?:\/\//.test(d.cta_url)) ? 'Ο σύνδεσμος του κουμπιού πρέπει να ξεκινά με https://' : null,
  },
  quiz: {
    table: 'quiz_questions', titleCol: 'question', order: 't.id desc', select: 't.* from quiz_questions t',
    cols: { question: col(T), options: jsonb(OPTS), correct_no: col(NUMR(1, 4)), explanation: col(T), active: col(B) },
    validate: (d) => ('options' in d && (d.options.length !== 4 || d.options.some((x) => !x))) ? 'Χρειάζονται ακριβώς 4 απαντήσεις (μία ανά γραμμή).' : ('correct_no' in d && !(+d.correct_no >= 1 && +d.correct_no <= 4)) ? 'Η σωστή απάντηση πρέπει να είναι από 1 έως 4.' : null,
  },
  words: {
    table: 'words', titleCol: 'word', order: 't.id desc', select: 't.* from words t',
    cols: { word: col(WORD), hint: col(T), active: col(B) },
    validate: (d) => ('word' in d && d.word.length < 3) ? 'Η λέξη πρέπει να έχει 3–14 ελληνικά γράμματα.' : null,
  },
  adventures: {
    table: 'adventures', slug: true, titleCol: 'title', order: 't.sort asc, t.id asc', touch: true, select: 't.* from adventures t',
    cols: { title: col(T), slug: col(T), description: col(L), cover_url: col(TN), unlock_level: col(NUMR(0, 50)), xp_reward: col(NUMR(0, 500)), status: col(ST), sort: col(I0), scenes: jsonb(SCENES) },
    validate: (d) => {
      if (!('scenes' in d)) return null;
      const sc = d.scenes; if (!sc.length) return 'Χρειάζεται τουλάχιστον μία σκηνή.';
      const ids = new Set(sc.map((s) => s.id));
      if (ids.size !== sc.length || ids.has('')) return 'Κάθε σκηνή χρειάζεται μοναδικό κωδικό.';
      for (const s of sc) {
        if (!s.text) return `Η σκηνή «${s.title || s.id}» δεν έχει κείμενο.`;
        if (!s.end && !s.choices.length) return `Η σκηνή «${s.title || s.id}» χρειάζεται επιλογές ή πρέπει να είναι τέλος.`;
        for (const c of s.choices) if (!c.label || !ids.has(c.to)) return `Μια επιλογή της σκηνής «${s.title || s.id}» δεν οδηγεί σε υπαρκτή σκηνή.`;
      }
      return sc.some((s) => s.end) ? null : 'Χρειάζεται τουλάχιστον μία σκηνή-τέλος.';
    },
  },
  media: {
    table: 'media', titleCol: 'name', order: 't.created_at desc', select: 't.* from media t',
    cols: { url: col(T), name: col(T), mime: col(T), size: col(I0), alt: col(T) },
  },
};
