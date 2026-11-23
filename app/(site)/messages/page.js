import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
/** Τα μηνύματα μεταφέρθηκαν στο chat (κρυπτογραφημένα άκρο-σε-άκρο). */
export default function Page({ searchParams }) {
  const base = process.env.NEXT_PUBLIC_CHAT_URL || '/chat';
  const w = +searchParams?.with || 0;
  redirect(`${base}#dm${w ? '/' + w : ''}`);
}
