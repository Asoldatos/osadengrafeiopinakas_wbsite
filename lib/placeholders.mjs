const esc = (s) => String(s).replace(/[&<>"']/g, '');
/** Αντικαθιστά {{sender}} στα κείμενα «ελεύθερου περιεχομένου» με τη διεύθυνση από την οποία στέλνονται τα email. */
export function fillPlaceholders(sections, sender = process.env.MAIL_FROM_EMAIL) {
  const val = sender ? esc(sender) : 'noreply του ιστοτόπου';
  return (Array.isArray(sections) ? sections : []).map((s) => (s?.type === 'custom' && typeof s.props?.html === 'string' ? { ...s, props: { ...s.props, html: s.props.html.replace(/\{\{\s*sender\s*\}\}/g, val) } } : s));
}
