// Δικαιώματα διαχειριστών. ΠΑΝΤΑ επιβάλλονται στον διακομιστή· το μενού απλώς κρύβει ό,τι δεν επιτρέπεται.
export const PERMS = {
  content: 'Επεξεργασία περιεχομένου (άρθρα, κατηγορίες, κουίζ, περιπέτειες)',
  publish: 'Δημοσίευση και απόκρυψη άρθρων, τευχών και περιπετειών',
  writers: 'Διαχείριση συντακτών',
  uploads: 'Μεταφόρτωση αρχείων (εικόνες, PDF, βίντεο, ήχοι)',
  editions: 'Τεύχη και διαδραστικά στοιχεία',
  appearance: 'Εμφάνιση ιστοτόπου (Σχεδιαστής)',
  themes: 'Εποχιακά θέματα (π.χ. Χριστούγεννα)',
  newsletter: 'Επεξεργασία ενημερωτικών και συνδρομητών',
  newsletter_send: 'Προγραμματισμός και αποστολή ενημερωτικών',
  students: 'Λογαριασμοί μαθητών',
  settings: 'Ρυθμίσεις ιστοτόπου',
  admins: 'Διαχείριση άλλων διαχειριστών',
};
export const PERM_KEYS = Object.keys(PERMS);
export const ROLE_LABEL = { superadmin: 'Superadmin', admin: 'Διαχειριστής', editor: 'Συντάκτης' };
export const EDITOR_PRESET = ['content', 'publish', 'writers', 'uploads', 'editions'];
export const uid = (u) => u?.user_id ?? u?.id;
export const isSuper = (u) => u?.role === 'superadmin';
export const can = (u, k) => !!u && !u.disabled && (isSuper(u) || u.permissions?.[k] === true);
export const cleanPerms = (input) => Object.fromEntries(PERM_KEYS.map((k) => [k, input?.[k] === true]));
export const presetPerms = (keys) => Object.fromEntries(PERM_KEYS.map((k) => [k, keys.includes(k)]));
export const allExceptAdmins = () => presetPerms(PERM_KEYS.filter((k) => k !== 'admins'));
/** Μπορεί ο actor να διαχειριστεί (επεξεργασία/απενεργοποίηση/διαγραφή/επαναφορά κωδικού) τον λογαριασμό target; */
export function canManageTarget(actor, target) {
  if (!actor || !target || uid(actor) === uid(target)) return false;
  if (isSuper(target)) return false;                        // ο Superadmin δεν χειρίζεται ποτέ από άλλον
  if (isSuper(actor)) return true;
  return can(actor, 'admins') && !can(target, 'admins');     // οι «ισότιμοι» διαχειριστές δεν αγγίζονται
}
/** Ποια δικαιώματα επιτρέπεται να δώσει ο actor: ποτέ περισσότερα από όσα έχει ο ίδιος και ποτέ το «admins» (εκτός αν είναι Superadmin). */
export function grantable(actor, perms) {
  const want = cleanPerms(perms);
  if (isSuper(actor)) return want;
  return Object.fromEntries(PERM_KEYS.map((k) => [k, want[k] && k !== 'admins' && can(actor, k)]));
}
/** Νέα δικαιώματα για τον target: ό,τι ο actor δεν μπορεί να χορηγήσει μένει όπως ήταν. */
export function mergePerms(actor, current, requested) {
  if (isSuper(actor)) return cleanPerms(requested);
  const want = grantable(actor, requested);
  return Object.fromEntries(PERM_KEYS.map((k) => [k, k !== 'admins' && can(actor, k) ? want[k] : current?.[k] === true]));
}
