export { DEFAULT_PAGES } from './sectionDefs.mjs';
export const DEFAULT_SITE = {
  name: 'Όσα δεν γράφει ο πίνακας',
  tagline: 'Η εφημερίδα των μαθητών',
  description: 'Η σχολική εφημερίδα «Όσα δεν γράφει ο πίνακας»: άρθρα, τεύχη και ιστορίες γραμμένες από μαθητές.',
  logoUrl: '/brand/logo_text.png', logoBgUrl: '/brand/logo_bg.png', faviconUrl: '/favicon.png', ogImage: '/brand/logo_bg.png',
  colors: { paper: '#FBF6EA', paper2: '#F3EAD3', ink: '#1D2A26', board: '#2C5E4A', c1: '#00C8E0', c2: '#E5231B', c3: '#FFC21F', c4: '#9B2CFF', c5: '#1FA0FF', c6: '#FF8A1F' },
  fonts: { heading: 'comfortaa', body: 'literata' },
  nav: [
    { label: 'Αρχική', href: '/', visible: true }, { label: 'Εφημερίδα', href: '/editions', visible: true },
    { label: 'Άρθρα', href: '/articles', visible: true }, { label: 'Κατηγορίες', href: '/categories', visible: true },
    { label: 'Η ομάδα μας', href: '/team', visible: true }, { label: 'Σχετικά με εμάς', href: '/about', visible: true },
    { label: 'Επικοινωνία', href: '/contact', visible: true },
  ],
  footer: {
    about: 'Η εφημερίδα που γράφουν οι μαθητές για όλα όσα δεν χωράνε στον πίνακα.',
    contact: { email: '', phone: '', address: '' },
    social: [], copyright: '© Όσα δεν γράφει ο πίνακας. Με αγάπη από τους μαθητές.',
    linksTitle: 'Πλοήγηση', contactTitle: 'Επικοινωνία',
  },
  announcement: { enabled: false, text: '', link: '' },
  mascot: { enabled: true, messages: {
    empty: 'Δεν έχω τίποτα να σου δείξω ακόμα… έλα ξανά σύντομα!',
    noResults: 'Χμμ, ψάχνω παντού αλλά δεν βρίσκω τίποτα. Δοκίμασε άλλες λέξεις;',
    loading: 'Φυλλομετράω την εφημερίδα… μισό λεπτό!',
    error: 'Ωπ! Κάτι πήγε στραβά. Δοκίμασε ξανά.',
    notFound: 'Αυτή η σελίδα έσβησε από τον πίνακα!',
    maintenance: 'Σκουπίζω τον πίνακα και φτιάχνω πράγματα. Επιστρέφουμε σύντομα!',
    login: 'Γεια σου! Δείξε μου το κλειδί σου.',
    twofa: 'Κράτα το κινητό σου: θα σκανάρουμε τον κωδικό QR μαζί!',
    twofaDone: 'Μπράβο! Ο λογαριασμός σου είναι τώρα πιο ασφαλής.',
    published: 'Δημοσιεύτηκε! Ο πίνακας τα έγραψε όλα.',
    saved: 'Αποθηκεύτηκε!',
    upload: 'Φέρε μου αρχεία! Τα φυλάω καλά.',
    adminTip: 'Συμβουλή: στον Σχεδιαστή πάτα πάνω σε ένα κείμενο για να το αλλάξεις απευθείας.',
    editions: 'Δεν υπάρχουν ακόμα τεύχη. Το πρώτο έρχεται σύντομα!',
    articles: 'Δεν υπάρχουν ακόμα άρθρα. Οι συντάκτες γράφουν…',
    team: 'Η ομάδα μας μαζεύεται ακόμα!',
  } },
  maintenance: { enabled: false, title: 'Επιστρέφουμε σύντομα', message: 'Σκουπίζουμε τον πίνακα και φτιάχνουμε νέα πράγματα. Ξαναπέρασε σε λίγο!', imageUrl: '' },
};
export const DEFAULT_CATEGORIES = [
  ['Ειδήσεις', '#E5231B'], ['Σχολική ζωή', '#00C8E0'], ['Πολιτισμός', '#9B2CFF'], ['Αθλητισμός', '#FF8A1F'], ['Γνώμες', '#1FA0FF'],
];
