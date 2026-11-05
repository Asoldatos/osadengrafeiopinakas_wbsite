import Link from 'next/link';
import { getEditions, getSchoolYears } from '@/lib/data';
import Pic from '@/components/Pic';
import { MascotSay } from '@/components/Mascot';
import { fmtDate } from '@/lib/util';

export const metadata = { title: 'Εφημερίδα – Αρχείο τευχών', description: 'Το αρχείο των τευχών της σχολικής εφημερίδας.', alternates: { canonical: '/editions' } };
export default async function Editions({ searchParams }) {
  const search = typeof searchParams.q === 'string' ? searchParams.q.trim() : '', year = typeof searchParams.year === 'string' ? searchParams.year : '';
  const [eds, years] = await Promise.all([getEditions({ search, year }), getSchoolYears()]);
  return (
    <div className="wrap page-pad">
      <h1 className="h1">Η εφημερίδα</h1><p className="lede">Όλα τα τεύχη μας, σε ένα ράφι. Διάλεξε ένα και φυλλομέτρησέ το.</p>
      <form className="filters" role="search" action="/editions" method="get">
        <label className="sr-only" htmlFor="q">Αναζήτηση τευχών</label>
        <input id="q" name="q" type="search" defaultValue={search} placeholder="Αναζήτηση τευχών…" />
        {year && <input type="hidden" name="year" value={year} />}
        <button className="btn btn-primary" type="submit">Αναζήτηση</button>
      </form>
      {years.length > 0 && <div className="chips" aria-label="Φίλτρο σχολικής χρονιάς">
        <Link className={`chip${!year ? ' on' : ''}`} href="/editions">Όλες οι χρονιές</Link>
        {years.map((y) => <Link key={y} className={`chip${year === y ? ' on' : ''}`} href={`/editions?year=${encodeURIComponent(y)}`}>{y}</Link>)}</div>}
      {!eds.length ? <MascotSay mood="reading" k={search || year ? 'noResults' : 'editions'} size={150} /> : (
        <ul className="shelf">{eds.map((e) => (
          <li key={e.id}><Link href={`/editions/${e.slug}`} className="book">
            <span className="book-cover"><Pic src={e.cover_url} alt={`Εξώφυλλο: ${e.title}`} ratio="3/4" sizes="260px" />{e.status === 'archived' && <span className="sticker sm">Αρχείο</span>}</span>
            <strong>{e.title}</strong><span className="meta">{[e.pub_date && fmtDate(e.pub_date), e.school_year].filter(Boolean).join(' · ')}</span></Link></li>))}</ul>)}
    </div>
  );
}
