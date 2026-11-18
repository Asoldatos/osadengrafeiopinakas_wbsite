import { renderText, blockHtml, safeHref } from '@/lib/tutorials.mjs';

/** Εμφάνιση ενός οδηγού (δημόσια σελίδα ΚΑΙ προεπισκόπηση στον επεξεργαστή).
 *  Το HTML των μπλοκ έχει καθαριστεί στον server (ίδιος καθαρισμός με τα άρθρα)· τα παλιά κείμενα περνούν από το renderText (escape). */
export default function TutorialView({ t, vars = {}, compact = false, onPick, active }) {
  const H = (s) => ({ __html: renderText(s || '', vars) });
  const B = (b) => ({ __html: blockHtml(b, vars) });
  const okImg = (u) => u && safeHref(u) && !/^(mailto|#)/.test(u);
  const Shot = ({ b }) => (okImg(b.img) ? <figure className="tut-fig"><img src={b.img} alt={b.caption || ''} loading="lazy" />{b.caption && <figcaption>{b.caption}</figcaption>}</figure> : null);
  const pick = (i) => (onPick ? { onClick: () => onPick(i), className: active === i ? 'tut-sel' : undefined, style: { cursor: 'pointer' } } : {});
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
          const p = pick(i);
          if (b.kind === 'step') { n++; return (
            <section key={i} {...p} className={`tut-step ${p.className || ''}`}><span className="tut-num" aria-hidden="true">{n}</span>
              <div className="tut-body"><h2><span className="sr-only">Βήμα {n}: </span>{b.title}</h2><div className="tut-rich" dangerouslySetInnerHTML={B(b)} /><Shot b={b} /></div></section>); }
          if (b.kind === 'tip' || b.kind === 'warn') return (
            <aside key={i} {...p} className={`tut-call ${b.kind} ${p.className || ''}`}><b>{b.kind === 'tip' ? '💡' : '⚠️'} {b.title}</b><div className="tut-rich" dangerouslySetInnerHTML={B(b)} /><Shot b={b} /></aside>);
          if (b.kind === 'image') return okImg(b.img) ? (
            <figure key={i} {...p} className={`tut-fig tut-img ${b.size === 'wide' ? 'wide' : ''} ${p.className || ''}`}><img src={b.img} alt={b.caption || ''} loading="lazy" />{b.caption && <figcaption>{b.caption}</figcaption>}</figure>)
            : (compact ? <div key={i} {...p} className={`tut-empty ${p.className || ''}`}>🖼️ Διάλεξε εικόνα</div> : null);
          if (b.kind === 'button') { const h = safeHref(b.href || ''); return h && b.label ? (
            <p key={i} {...p} className={`tut-btnrow ${p.className || ''}`}><a className={`btn ${b.style === 'ghost' ? 'btn-ghost' : 'btn-primary'}`} href={h} onClick={onPick ? (e) => e.preventDefault() : undefined}>{b.label} →</a></p>) : null; }
          return <section key={i} {...p} className={`tut-info ${p.className || ''}`}>{b.title && <h2>{b.title}</h2>}<div className="tut-rich" dangerouslySetInnerHTML={B(b)} /><Shot b={b} /></section>;
        })}
      </div>
      {t.outro && <div className="tut-outro" dangerouslySetInnerHTML={H(t.outro)} />}
    </article>
  );
}
