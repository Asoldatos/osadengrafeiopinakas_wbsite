export default function manifest() {
  return {
    name: 'Όσα δεν γράφει ο πίνακας', short_name: 'Ο Πίνακας', lang: 'el', start_url: '/', display: 'standalone',
    background_color: '#FBF6EA', theme_color: '#2C5E4A',
    icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }],
  };
}
