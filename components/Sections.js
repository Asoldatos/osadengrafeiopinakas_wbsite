'use client';
import Link from 'next/link';
import { createContext, useContext } from 'react';
import Mascot, { MascotSay } from './Mascot';
import Pic from './Pic';
import Media from './Media';
import NewsletterForm from './NewsletterForm';
import { isVideoUrl } from '@/lib/media';
import { fmtDate, safeUrl, toEmbed, cx } from '@/lib/util';

export const EditCtx = createContext({ editing: false, onText: () => {}, site: {} });

/* Κείμενο που επεξεργάζεται απευθείας στο προεπισκόπηση (μόνο στον Σχεδιαστή) */
function Ed({ id, path, tag: Tag = 'span', className = '', children }) {
  const { editing, onText } = useContext(EditCtx);
  if (!editing) return <Tag className={className || undefined}>{children}</Tag>;
  return (
    <Tag className={cx(className, 'ed')} contentEditable suppressContentEditableWarning spellCheck={false} data-ph="Γράψε εδώ…"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => { if (e.key === 'Enter' && Tag !== 'div') { e.preventDefault(); e.currentTarget.blur(); } }}
      onBlur={(e) => onText(id, path, e.currentTarget.innerText.replace(/\u00a0/g, ' ').trim())}>{children}</Tag>
  );
}
const Btn = ({ href, children, kind = 'primary' }) => (children ? <Link className={`btn btn-${kind}`} href={safeUrl(href)}>{children}</Link> : null);
const Head = ({ s, p, light }) => (p.title || p.subtitle ? (
  <header className={cx('sec-head', light && 'on-board')}>
    {p.title !== undefined && <Ed id={s.id} path="title" tag="h2" className="h2">{p.title}</Ed>}
    {p.subtitle !== undefined && p.subtitle !== '' && <Ed id={s.id} path="subtitle" tag="p" className="lede">{p.subtitle}</Ed>}
    <Squiggle />
  </header>) : null);
export const Squiggle = () => <svg className="squiggle" viewBox="0 0 120 12" aria-hidden="true"><path d="M2 7 Q12 0 22 7 T42 7 T62 7 T82 7 T102 7 T118 7" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" /></svg>;
const Doodles = () => (
  <svg className="doodles" viewBox="0 0 600 400" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
    <g fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity=".55">
      <path className="dd" d="M40 70 l8 18 20 2 -15 13 5 20 -18 -10 -18 10 5 -20 -15 -13 20 -2z" />
      <path className="dd" d="M520 60 q15 -25 30 0 t30 0" /><path d="M470 330 l30 -20 M500 310 l-4 22 M500 310 l22 4" />
      <circle cx="110" cy="340" r="14" /><path className="dd" d="M300 36 q10 -14 20 0 t20 0 t20 0" />
      <path d="M560 200 l12 -12 m0 12 l-12 -12" /><path className="dd" d="M20 220 q20 -30 40 0" />
    </g>
  </svg>
);
const paras = (t) => String(t || '').split(/\n{2,}/).filter(Boolean);
function ArticleMeta({ a }) {
  return <p className="meta">{a.author_name && <>{a.author_name} · </>}{fmtDate(a.date)}</p>;
}
const Tag = ({ a }) => (a.category_name ? <span className="tag" style={{ '--c': a.category_color || '#00C8E0' }}>{a.category_name}</span> : null);

function Hero({ s, p }) {
  const { site } = useContext(EditCtx);
  return (
    <div className="hero board">
      <Doodles />
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <Ed id={s.id} path="eyebrow" tag="p" className="eyebrow">{p.eyebrow}</Ed>
          {p.showLogo && site.logoUrl
            ? <h1 className="hero-logo"><Media src={site.logoUrl} alt={p.title || site.name} width="869" height="322" loading="eager" /></h1>
            : <Ed id={s.id} path="title" tag="h1" className="hero-title">{p.title}</Ed>}
          <Ed id={s.id} path="subtitle" tag="p" className="hero-sub">{p.subtitle}</Ed>
          <div className="btns"><Btn href={p.ctaHref}>{p.ctaLabel}</Btn><Btn href={p.cta2Href} kind="light">{p.cta2Label}</Btn></div>
        </div>
        {p.showMascot && <div className="hero-mascot"><div className="speech">Γεια! Είμαι ο Κιμωλάκης 👋</div><Mascot mood={p.mascotMood || 'wave'} size={230} /></div>}
      </div>
      <div className="ledge" aria-hidden="true"><i /><i /><i /></div>
    </div>
  );
}
function PageHeader({ s, p }) {
  return <div className="wrap page-head"><Ed id={s.id} path="title" tag="h1" className="h1">{p.title}</Ed>{p.subtitle !== '' && <Ed id={s.id} path="subtitle" tag="p" className="lede">{p.subtitle}</Ed>}<Squiggle /></div>;
}
function LatestEdition({ s, p, data }) {
  const e = data?.editions?.[0];
  return (
    <div className="wrap le">
      <div className="le-art">
        {e ? <Link href={`/editions/${e.slug}`} className="stack" aria-label={`Άνοιγμα τεύχους: ${e.title}`}><span className="stack-p s3" /><span className="stack-p s2" /><Pic src={e.cover_url} alt={`Εξώφυλλο: ${e.title}`} ratio="3/4" className="stack-cover" sizes="320px" /><span className="sticker">ΝΕΟ!</span></Link>
          : <MascotSay mood="reading" k="editions" />}
      </div>
      <div className="le-txt">
        <Ed id={s.id} path="title" tag="h2" className="h2">{p.title}</Ed>
        <Ed id={s.id} path="subtitle" tag="p" className="lede">{p.subtitle}</Ed>
        {e && <p className="meta big">{e.title}{e.pub_date ? ` · ${fmtDate(e.pub_date)}` : ''}{e.school_year ? ` · ${e.school_year}` : ''}</p>}
        {e?.description && <p>{e.description.slice(0, 220)}{e.description.length > 220 ? '…' : ''}</p>}
        <div className="btns">{e && <Btn href={`/editions/${e.slug}`}>{p.ctaLabel}</Btn>}<Btn href={p.cta2Href} kind="ghost">{p.cta2Label}</Btn></div>
      </div>
    </div>
  );
}
function Featured({ s, p, data }) {
  const list = (data?.featured?.length ? data.featured : data?.recent || []).slice(0, 3);
  return (
    <div className="wrap"><Head s={s} p={p} />
      {!list.length ? <MascotSay mood="oops" k="articles" /> : (
        <div className="feat">
          {list.map((a, i) => (
            <Link key={a.id} href={`/articles/${a.slug}`} className={cx('feat-card', i === 0 && 'feat-big')}>
              <Pic src={a.cover_url} alt="" ratio={i === 0 ? '4/3' : '16/10'} priority={i === 0} />
              <div className="feat-body"><Tag a={a} /><h3>{a.title}</h3>{i === 0 && a.subtitle && <p>{a.subtitle}</p>}<ArticleMeta a={a} /></div>
            </Link>))}
        </div>)}
    </div>
  );
}
function Recent({ s, p, data }) {
  const list = (data?.recent || []).slice(0, Math.max(1, +p.count || 6));
  return (
    <div className="wrap"><Head s={s} p={p} />
      {!list.length ? <MascotSay mood="confused" k="articles" /> : (
        <ol className="rlist">
          {list.map((a, i) => (
            <li key={a.id}><Link href={`/articles/${a.slug}`} className="rrow">
              <span className="rnum" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <span className="rmain"><Tag a={a} /><strong>{a.title}</strong>{a.subtitle && <em>{a.subtitle}</em>}</span>
              <span className="rdate">{fmtDate(a.date)}</span><span className="rarrow" aria-hidden="true">→</span></Link></li>))}
        </ol>)}
      {p.ctaLabel && <div className="btns center"><Btn href={p.ctaHref} kind="ghost">{p.ctaLabel}</Btn></div>}
    </div>
  );
}
function Categories({ s, p, data }) {
  const cs = data?.categories || [];
  return (
    <div className="wrap"><Head s={s} p={p} />
      {!cs.length ? <MascotSay mood="confused" k="empty" /> : (
        <div className="tickets">{cs.map((c, i) => (
          <Link key={c.id} href={`/articles?category=${c.slug}`} className="ticket" style={{ '--c': c.color, '--r': `${[-2, 1.5, -1, 2.5, -1.5][i % 5]}deg` }}>
            <span className="ticket-n">{c.name}</span><span className="ticket-c">{c.count} {c.count === 1 ? 'άρθρο' : 'άρθρα'}</span></Link>))}</div>)}
    </div>
  );
}
function Team({ s, p, data }) {
  const ws = (data?.writers || []).slice(0, Math.max(1, +p.count || 8));
  return (
    <div className="wrap"><Head s={s} p={p} />
      {!ws.length ? <MascotSay mood="wave" k="team" /> : (
        <ul className="polas">{ws.map((w, i) => (
          <li key={w.id} className="pola" style={{ '--r': `${[-2.5, 1.5, -1, 2, -1.8, 1][i % 6]}deg` }}>
            <Pic src={w.photo_url} alt={w.photo_url ? `Φωτογραφία: ${w.name}` : ''} ratio="1/1" sizes="240px" />
            {!w.photo_url && <span className="pola-i" aria-hidden="true">{w.name.trim().charAt(0)}</span>}
            <strong>{w.name}</strong>{w.role && <span className="role">{w.role}</span>}{w.bio && <p>{w.bio}</p>}</li>))}</ul>)}
      {p.ctaLabel && <div className="btns center"><Btn href={p.ctaHref} kind="ghost">{p.ctaLabel}</Btn></div>}
    </div>
  );
}
function TextImage({ s, p, kind }) {
  const left = p.imageSide === 'left';
  return (
    <div className={cx('wrap ti', left && 'ti-left')}>
      <div className="ti-txt">
        <Ed id={s.id} path="title" tag="h2" className="h2">{p.title}</Ed><Squiggle />
        <Ed id={s.id} path="text" tag="div" className="prose">{paras(p.text).map((t, i) => <p key={i}>{t}</p>)}</Ed>
        <div className="btns"><Btn href={p.ctaHref}>{p.ctaLabel}</Btn></div>
      </div>
      <div className="ti-art">{p.image ? <Pic src={p.image} alt="" ratio="4/3" className="framed" /> : <Mascot mood="reading" size={210} />}</div>
    </div>
  );
}
function Banner({ s, p }) {
  return <div className="banner" style={{ background: p.color }}><div className="wrap banner-in"><Ed id={s.id} path="text" tag="p" className="banner-t">{p.text}</Ed><Btn href={p.ctaHref} kind="dark">{p.ctaLabel}</Btn></div></div>;
}
function Video({ s, p }) {
  const e = toEmbed(p.url);
  return (
    <div className="wrap narrow"><Head s={s} p={{ title: p.title }} />
      {!e ? <MascotSay mood="confused" text="Δεν έχει οριστεί έγκυρο βίντεο ακόμα." /> : e.kind === 'video' ? <video className="hs-media" src={e.src} controls playsInline preload="metadata" /> : <div className="embed"><iframe src={e.src} title={p.title || 'Βίντεο'} allow="fullscreen; picture-in-picture" allowFullScreen loading="lazy" /></div>}
      {p.caption && <Ed id={s.id} path="caption" tag="p" className="caption">{p.caption}</Ed>}
    </div>
  );
}
function Gallery({ s, p }) {
  const im = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
  return (
    <div className="wrap"><Head s={s} p={{ title: p.title }} />
      {!im.length ? <MascotSay mood="confused" text="Η συλλογή δεν έχει εικόνες ακόμα." /> : <div className="gal">{im.map((u, i) => <Pic key={i} src={u} alt={`Εικόνα ${i + 1} της συλλογής`} ratio={['4/3', '1/1', '3/4', '4/3'][i % 4]} sizes="(max-width:800px) 50vw, 25vw" />)}</div>}
    </div>
  );
}
function Announcement({ s, p }) {
  return <div className="wrap narrow"><aside className="note"><span className="pin" aria-hidden="true">📌</span><Ed id={s.id} path="title" tag="h3">{p.title}</Ed><Ed id={s.id} path="text" tag="p">{p.text}</Ed><Btn href={p.ctaHref}>{p.ctaLabel}</Btn></aside></div>;
}
function Contact({ s, p }) {
  const { site } = useContext(EditCtx); const c = site.footer?.contact || {}, soc = site.footer?.social || [];
  const any = c.email || c.phone || c.address || soc.length;
  return (
    <div className="wrap narrow"><header className="sec-head"><Ed id={s.id} path="title" tag="h2" className="h2">{p.title}</Ed><Ed id={s.id} path="text" tag="p" className="lede">{p.text}</Ed></header>
      {!any ? <MascotSay mood="phone" text="Τα στοιχεία επικοινωνίας δεν έχουν συμπληρωθεί ακόμα." /> : (
        <div className="contact-grid">
          {c.email && <a className="ccard" href={`mailto:${c.email}`}><span aria-hidden="true">✉️</span><b>Email</b>{c.email}</a>}
          {c.phone && <a className="ccard" href={`tel:${c.phone.replace(/\s/g, '')}`}><span aria-hidden="true">📞</span><b>Τηλέφωνο</b>{c.phone}</a>}
          {c.address && <div className="ccard"><span aria-hidden="true">📍</span><b>Διεύθυνση</b>{c.address}</div>}
          {soc.map((x, i) => <a key={i} className="ccard" href={safeUrl(x.url)} target="_blank" rel="noopener noreferrer"><span aria-hidden="true">🌐</span><b>{x.label}</b>Άνοιγμα ↗</a>)}
        </div>)}
    </div>
  );
}
function Newsletter({ s, p }) {
  const { site } = useContext(EditCtx), n = site.newsletter || {};
  return <div className="wrap narrow"><div className="nl-card"><Ed id={s.id} path="title" tag="h2" className="h2">{p.title}</Ed><Ed id={s.id} path="text" tag="p" className="lede">{p.text}</Ed>
    <NewsletterForm button={p.button} placeholder={n.placeholder} thanks={site.mascot?.messages?.newsletterThanks} /></div></div>;
}
const Custom = ({ p }) => <div className="wrap narrow prose" dangerouslySetInnerHTML={{ __html: p.html || '' }} />;

const RENDER = { hero: Hero, pageHeader: PageHeader, latestEdition: LatestEdition, featured: Featured, recent: Recent, categories: Categories, team: Team, about: TextImage, textImage: TextImage, banner: Banner, video: Video, gallery: Gallery, announcement: Announcement, contact: Contact, newsletter: Newsletter, custom: Custom };

export default function Sections({ sections = [], data, site, editing = false, selectedId, onSelect, onText }) {
  return (
    <EditCtx.Provider value={{ editing, onText: onText || (() => {}), site: site || {} }}>
      {sections.filter((s) => editing || !s.hidden).map((s) => {
        const C = RENDER[s.type]; if (!C) return null;
        const st = s.style || {};
        const style = { paddingTop: st.padTop, paddingBottom: st.padBottom, ...(st.bg ? { background: st.bg } : {}), ...(st.bgImage && !isVideoUrl(st.bgImage) ? { backgroundImage: `url("${encodeURI(st.bgImage)}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}) };
        return (
          <section key={s.id} data-sec={s.id} style={style} aria-label={undefined}
            className={cx('sec', `sec-${s.type}`, editing && 'sec-edit', selectedId === s.id && 'is-sel', s.hidden && 'is-hidden')}
            onClickCapture={editing ? (e) => { if (e.target.closest('a')) e.preventDefault(); onSelect?.(s.id); } : undefined}>
            {editing && <span className="sec-tag">{s.type}{s.hidden ? ' · κρυφή' : ''}</span>}
            {st.bgImage && isVideoUrl(st.bgImage) && <div className="sec-bgv" aria-hidden="true"><Media src={st.bgImage} background /></div>}
            <C s={s} p={s.props || {}} data={data} />
          </section>);
      })}
    </EditCtx.Provider>
  );
}
