import './globals.css';
import { Comfortaa, Literata, Manrope } from 'next/font/google';
import { getSite } from '@/lib/data';
import { MascotProvider } from '@/components/Mascot';
import { SITE_URL } from '@/lib/util';
import { imageOnly } from '@/lib/media';

const comfortaa = Comfortaa({ subsets: ['greek', 'latin'], variable: '--f-comfortaa', display: 'swap' });
const literata = Literata({ subsets: ['greek', 'latin'], variable: '--f-literata', display: 'swap' });
const manrope = Manrope({ subsets: ['greek', 'latin'], variable: '--f-manrope', display: 'swap' });

export async function generateMetadata() {
  const s = await getSite();
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: s.name, template: `%s · ${s.name}` },
    description: s.description,
    icons: { icon: [{ url: imageOnly(s.faviconUrl) || '/favicon.png' }], apple: '/apple-touch-icon.png' },
    openGraph: { siteName: s.name, locale: 'el_GR', type: 'website', title: s.name, description: s.description, images: imageOnly(s.ogImage) ? [imageOnly(s.ogImage)] : [] },
    twitter: { card: 'summary_large_image' },
    alternates: { canonical: '/' },
  };
}
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#2C5E4A' };
const HEX = /^#[0-9a-fA-F]{3,8}$/;

export default async function RootLayout({ children }) {
  const s = await getSite();
  const vars = Object.entries(s.colors || {}).filter(([, v]) => HEX.test(v)).map(([k, v]) => `--${k}:${v}`).join(';');
  const fh = ['comfortaa', 'literata', 'manrope'].includes(s.fonts?.heading) ? s.fonts.heading : 'comfortaa';
  const fb = ['comfortaa', 'literata', 'manrope'].includes(s.fonts?.body) ? s.fonts.body : 'literata';
  return (
    <html lang="el" className={`${comfortaa.variable} ${literata.variable} ${manrope.variable}`}>
      <head><style dangerouslySetInnerHTML={{ __html: `:root{${vars};--font-head:var(--f-${fh});--font-body:var(--f-${fb})}` }} /></head>
      <body>
        <MascotProvider enabled={s.mascot?.enabled !== false} messages={s.mascot?.messages || {}}>{children}</MascotProvider>
      </body>
    </html>
  );
}
