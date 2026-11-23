import { notFound } from 'next/navigation';
import Sections from '@/components/Sections';
import Game3D from '@/components/play/Game3D';
import CommunityStrip from '@/components/community/CommunityStrip';
import { getPage, getSiteData, getSite } from '@/lib/data';
import { SITE_URL } from '@/lib/util';

export async function generateMetadata() { const s = await getSite(); return { title: { absolute: `${s.name} – ${s.tagline}` }, alternates: { canonical: '/' } }; }
export default async function Home() {
  const [sections, data, site] = await Promise.all([getPage('home'), getSiteData(), getSite()]);
  if (!sections) notFound();
  // το 3D παιχνίδι μπαίνει αμέσως κάτω από την πρώτη ενότητα (συνήθως το hero) για να το βλέπουν όλοι
  const [first, ...rest] = sections;
  // δομημένα δεδομένα: λένε στη Google το όνομα του ιστοτόπου (αντί για το «osaden.gr») και το λογότυπο
  const sameAs = (site.footer?.social || []).map((x) => x?.url).filter((u) => /^https:\/\//.test(u || ''));
  const ld = [
    { '@context': 'https://schema.org', '@type': 'WebSite', name: site.name, alternateName: ['Όσα δεν γράφει ο πίνακας', 'osaden.gr'], url: `${SITE_URL}/`, inLanguage: 'el' },
    { '@context': 'https://schema.org', '@type': 'Organization', name: site.name, url: `${SITE_URL}/`, logo: `${SITE_URL}/icon-512.png`, ...(sameAs.length ? { sameAs } : {}) },
  ];
  return (<>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
    <Sections sections={first ? [first] : []} data={data} site={site} />
    <div className="wrap"><Game3D /></div>
    <CommunityStrip />
    {rest.length > 0 && <Sections sections={rest} data={data} site={site} />}
  </>);
}
