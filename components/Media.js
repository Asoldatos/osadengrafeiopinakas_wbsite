'use client';
import { useEffect, useRef, useState } from 'react';
import { isVideoUrl, parseVideo } from '@/lib/media';

/** Εμφανίζει εικόνα ή βίντεο, ανάλογα με τη διεύθυνση, εφαρμόζοντας τις ρυθμίσεις του βίντεο.
 *  background: φόντο χωρίς χειριστήρια (αυτόματη αναπαραγωγή, επανάληψη, χωρίς ήχο). */
export default function Media({ src, alt = '', className, style, width, height, loading = 'lazy', background = false, fit }) {
  const ref = useRef(null); const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const m = window.matchMedia?.('(prefers-reduced-motion: reduce)'); if (!m) return;
    setReduce(m.matches); if (m.matches) ref.current?.pause?.();
  }, []);
  if (!src) return null;
  if (!isVideoUrl(src)) return <img src={src} alt={alt} className={className} style={style} width={width} height={height} loading={loading} decoding="async" />;
  const o = parseVideo(src);
  const wantsAuto = background || o.autoplay;
  const auto = wantsAuto && !reduce;                       // σεβόμαστε την ρύθμιση «μείωση κίνησης»
  const controls = background ? false : o.controls || (wantsAuto && reduce);
  const muted = background || o.muted || o.autoplay;
  return (
    <video ref={ref} src={o.url} poster={o.poster || undefined} className={className} width={width} height={height}
      style={{ objectFit: fit || o.fit, ...style }} controls={controls} autoPlay={auto} loop={background || o.loop} muted={muted} playsInline
      preload={auto ? 'auto' : 'metadata'} aria-label={background ? undefined : alt || 'Βίντεο'} aria-hidden={background ? true : undefined}
      onClick={(e) => { if (controls && e.currentTarget.closest('a')) e.preventDefault(); }} />
  );
}
