import { notFound } from 'next/navigation';
import Sections from '@/components/Sections';
import { getPage, getSiteData, getSite } from '@/lib/data';

export async function generateMetadata() { const s = await getSite(); return { title: { absolute: `${s.name} – ${s.tagline}` }, alternates: { canonical: '/' } }; }
export default async function Home() {
  const [sections, data, site] = await Promise.all([getPage('home'), getSiteData(), getSite()]);
  if (!sections) notFound();
  return <Sections sections={sections} data={data} site={site} />;
}
