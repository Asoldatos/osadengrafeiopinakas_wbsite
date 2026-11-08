import NewsletterForm from '@/components/NewsletterForm';
import { getSite } from '@/lib/data';
export const metadata = { title: 'Ενημερωτικό δελτίο', description: 'Γράψου στο ενημερωτικό δελτίο και μάθε πρώτος για νέα τεύχη και άρθρα.', alternates: { canonical: '/newsletter' } };
export default async function Page() {
  const n = (await getSite()).newsletter || {}, m = (await getSite()).mascot?.messages || {};
  return (<div className="wrap narrow page-pad"><h1 className="h1">{n.title || 'Ενημερωτικό δελτίο'}</h1><p className="lede">{n.text}</p>
    <div className="card"><NewsletterForm button={n.button} placeholder={n.placeholder} thanks={m.newsletterThanks} /></div></div>);
}
