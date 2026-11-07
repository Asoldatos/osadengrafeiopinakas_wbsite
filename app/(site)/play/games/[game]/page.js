import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStudent } from '@/lib/student';
import { MascotSay } from '@/components/Mascot';
import Quiz from '@/components/play/Quiz';
import Memory from '@/components/play/Memory';
import Hangman from '@/components/play/Hangman';
import Catch from '@/components/play/Catch';
import Leaderboard from '@/components/play/Leaderboard';
import { GAMES } from '@/lib/progress.mjs';
export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }) { const g = GAMES[params.game]; return g ? { title: g.label, description: g.desc, alternates: { canonical: `/play/games/${params.game}` } } : { title: 'Παιχνίδι' }; }

export default async function GamePage({ params }) {
  const g = GAMES[params.game];
  if (!g) notFound();
  const st = await getStudent();
  const C = { quiz: Quiz, memory: Memory, hangman: Hangman, catch: Catch }[params.game];
  return (
    <div className="wrap narrow page-pad">
      <p><Link href="/play">← Όλα τα παιχνίδια</Link></p>
      <h1 className="h1">{g.icon} {g.label}</h1><p className="lede">{g.desc}</p>
      {!g.public && !st ? <div className="card"><MascotSay mood="wave" k="locked" size={110}><div className="btns"><Link className="btn btn-primary" href={`/account/register`}>Φτιάξε λογαριασμό</Link><Link className="btn btn-ghost" href={`/account/login?next=/play/games/${params.game}`}>Σύνδεση</Link></div></MascotSay></div>
        : <><C signedIn={!!st} />{st ? <Leaderboard game={params.game} /> : <p className="muted small center">🔒 Με λογαριασμό κερδίζεις πόντους και μπαίνεις στον πίνακα κατάταξης.</p>}</>}
    </div>
  );
}
