import { notFound } from 'next/navigation';
import { getEdition, getHotspots } from '@/lib/data';
import { getAdmin } from '@/lib/auth';
import { getStudent } from '@/lib/student';
import { getSite } from '@/lib/data';
import Link from 'next/link';
import Pic from '@/components/Pic';
import Viewer from '@/components/Viewer';
import { MascotSay } from '@/components/Mascot';
import { fmtDate } from '@/lib/util';
import { imageOnly } from '@/lib/media';

async function load(params, sp) {
  const admin = sp?.preview ? await getAdmin() : null;
  return getEdition(decodeURIComponent(params.slug), !!admin);
}
export async function generateMetadata({ params, searchParams }) {
  const e = await load(params, searchParams);
  if (!e) return { title: 'Δεν βρέθηκε το τεύχος' };
  return { title: e.title, description: e.description?.slice(0, 160) || `Τεύχος της σχολικής εφημερίδας${e.school_year ? ` (${e.school_year})` : ''}.`,
    alternates: { canonical: `/editions/${e.slug}` }, robots: e.status === 'draft' ? { index: false } : undefined,
    openGraph: { title: e.title, images: imageOnly(e.cover_url) ? [imageOnly(e.cover_url)] : undefined } };
}
export default async function EditionPage({ params, searchParams }) {
  const e = await load(params, searchParams);
  if (!e) notFound();
  const admin = searchParams?.preview ? await getAdmin() : null;
  const hs = await getHotspots(e.id);
  const acc = (await getSite()).accounts || {};
  const [adminU, st] = [await getAdmin(), await getStudent()];
  const loginHref = `/account/login?next=${encodeURIComponent('/editions/' + e.slug)}`;
  const readLocked = acc.requireForReading === true && !adminU && !st;
  const canRead = e.digital_pdf_url && (e.digital_public || admin) && !readLocked;
  const hasPrint = e.print_pdf_url && (e.print_public || admin);
  const printOpen = hasPrint && (acc.printRequiresAccount === false || adminU || st);
  const printLocked = hasPrint && !printOpen;
  return (
    <>
      {e.status === 'draft' && <div className="adminbar">Προεπισκόπηση — το τεύχος δεν είναι δημόσιο.</div>}
      <div className="wrap page-pad ed-head">
        <Pic src={e.cover_url} alt={`Εξώφυλλο: ${e.title}`} ratio="3/4" className="ed-cover" priority sizes="240px" />
        <div><h1 className="h1">{e.title}</h1>
          <p className="meta big">{[e.pub_date && fmtDate(e.pub_date), e.school_year && `Σχολική χρονιά ${e.school_year}`].filter(Boolean).join(' · ')}</p>
          {e.description && <p className="lede">{e.description}</p>}
          {printOpen && <p><a className="btn btn-ghost" href={`/api/pdf/print/${e.slug}?download=1`}>⬇ Λήψη εκτυπώσιμου PDF</a></p>}
          {printLocked && <p><Link className="btn btn-ghost" href={loginHref}>🔒 Συνδέσου για λήψη εκτυπώσιμου PDF</Link></p>}
        </div>
      </div>
      <div className="wrap viewer-wrap">
        {canRead ? <Viewer edition={{ slug: e.slug, title: e.title }} hotspots={hs} printUrl={printOpen ? `/api/pdf/print/${e.slug}?download=1` : null} printLocked={printLocked ? loginHref : null} />
          : readLocked && e.digital_pdf_url ? <MascotSay mood="wave" k="downloadLogin" size={110}><div className="btns"><Link className="btn btn-primary" href={loginHref}>Σύνδεση</Link><Link className="btn btn-ghost" href="/account/register">Φτιάξε λογαριασμό</Link></div></MascotSay>
          : <MascotSay mood="oops" text="Η ψηφιακή έκδοση αυτού του τεύχους δεν είναι διαθέσιμη προς το παρόν." />}
      </div>
    </>
  );
}
