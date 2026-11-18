import { renderText } from '@/lib/tutorials.mjs';

/** Εμφάνιση ενός οδηγού (χρησιμοποιείται στη δημόσια σελίδα ΚΑΙ στην προεπισκόπηση του επεξεργαστή).
 *  Το HTML παράγεται από το renderText, που κάνει escape σε όλο το κείμενο πριν προσθέσει μορφοποίηση. */
export default function TutorialView({ t, vars = {}, compact = false }) {
  const H = (s) => ({ __html: renderText(s || '', vars) });
  let n = 0;
  return (
    <article className={`tut${compact ? ' tut-compact' : ''}`}>
      <header className="tut-head">
        <span className="tut-icon" aria-hidden="true">{t.icon || '📘'}</span>
        <div><h1>{t.title || 'Χωρίς τίτλο'}</h1>{t.subtitle && <p className="tut-sub">{t.subtitle}</p>}</div>
      </header>
      {t.intro && <div className="tut-intro" dangerouslySetInnerHTML={H(t.intro)} />}
      <div className="tut-blocks">
        {(t.blocks || []).map((b, i) => {
          if (b.kind === 'step') { n++; return (
            <section key={i} className="tut-step"><span className="tut-num" aria-hidden="true">{n}</span>
              <div className="tut-body"><h2><span className="sr-only">Βήμα {n}: </span>{b.title}</h2><div dangerouslySetInnerHTML={H(b.text)} /></div></section>); }
          if (b.kind === 'tip' || b.kind === 'warn') return (
            <aside key={i} className={`tut-call ${b.kind}`}><b>{b.kind === 'tip' ? '💡' : '⚠️'} {b.title}</b><div dangerouslySetInnerHTML={H(b.text)} /></aside>);
          return <section key={i} className="tut-info">{b.title && <h2>{b.title}</h2>}<div dangerouslySetInnerHTML={H(b.text)} /></section>;
        })}
      </div>
      {t.outro && <div className="tut-outro" dangerouslySetInnerHTML={H(t.outro)} />}
    </article>
  );
}
