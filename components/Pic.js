import Image from 'next/image';

/** Εικόνα με σταθερή αναλογία· βελτιστοποίηση μέσω next/image για αρχεία του ιστοτόπου και του Blob. */
export default function Pic({ src, alt = '', ratio = '16/10', className = '', sizes = '(max-width: 800px) 100vw, 50vw', priority = false, fit = 'cover' }) {
  if (!src) return <div className={`pic pic-empty ${className}`} style={{ aspectRatio: ratio }} aria-hidden="true" />;
  const own = src.startsWith('/') || src.includes('.public.blob.vercel-storage.com');
  const svg = /\.svg(\?|$)/i.test(src);
  return (
    <div className={`pic ${className}`} style={{ aspectRatio: ratio }}>
      {own && !svg
        ? <Image src={src} alt={alt} fill sizes={sizes} priority={priority} style={{ objectFit: fit }} />
        : <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} decoding="async" style={{ objectFit: fit }} />}
    </div>
  );
}
