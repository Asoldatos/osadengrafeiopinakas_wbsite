'use client';
import Link from 'next/link';
import { MascotSay } from './Mascot';
/** Κιμωλάκης που θυμίζει να ελέγξεις τα ανεπιθύμητα, με σύνδεσμο στον οδηγό. Το μήνυμα (junkHint) αλλάζει από τις Ρυθμίσεις. */
export default function JunkHint({ onHelp, size = 64 }) {
  return (
    <MascotSay mood="reading" k="junkHint" size={size} className="junk">
      {onHelp ? <button type="button" className="linkbtn" onClick={onHelp}>Δες πώς</button> : <Link className="linkbtn" href="/email-help">Δες πώς</Link>}
    </MascotSay>
  );
}
