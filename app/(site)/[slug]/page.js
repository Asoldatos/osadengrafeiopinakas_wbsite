import { notFound } from 'next/navigation';
import Sections from '@/components/Sections';
import { getPage, getSiteData, getSite } from '@/lib/data';

export async function generateMetadata({ params }) {
  const sections = await getPage(params.slug).catch(() => null);
  const h = sections?.find((s) => s.type === 'pageHeader');
  return { title: h?.props?.title || undefined, description: h?.props?.subtitle || undefined, alternates: { canonical: `/${params.slug}` } };
}
export default async function CustomPage({ params }) {
  const sections = await getPage(params.slug);
  if (!sections) notFound();
  const [data, site] = await Promise.all([getSiteData(), getSite()]);
  return <Sections sections={sections} data={data} site={site} />;
}
