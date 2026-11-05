import sanitizeHtml from 'sanitize-html';

const COMMON = {
  allowedTags: ['p','br','h2','h3','h4','strong','b','em','i','u','s','blockquote','ul','ol','li','a','img','figure','figcaption','hr','span','code','pre'],
  allowedAttributes: { a: ['href', 'target', 'rel'], img: ['src', 'alt'] },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  transformTags: {
    a: (tag, attribs) => ({ tagName: 'a', attribs: { ...attribs, rel: 'noopener noreferrer', target: attribs.href?.startsWith('/') ? '_self' : '_blank' } }),
  },
};
export const cleanHtml = (h) => sanitizeHtml(String(h || ''), COMMON);
export const cleanText = (t, max = 2000) => String(t ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, max);

const SVG_ATTRS = ['viewBox','xmlns','width','height','d','fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','stroke-dasharray','opacity','transform','cx','cy','r','rx','ry','x','y','x1','y1','x2','y2','points','offset','stop-color','stop-opacity','id','gradientUnits','gradientTransform','fill-rule','clip-rule','clip-path','font-size','font-family','font-weight','text-anchor','preserveAspectRatio'];
/** Αυστηρή λίστα επιτρεπτών στοιχείων SVG: χωρίς script, foreignObject, href, on*, style. */
export function cleanSvg(src) {
  const out = sanitizeHtml(String(src || ''), {
    allowedTags: ['svg','g','path','circle','ellipse','rect','line','polyline','polygon','defs','linearGradient','radialGradient','stop','clipPath','mask','text','tspan','title','desc'],
    allowedAttributes: { '*': SVG_ATTRS },
    allowedSchemes: [],
    parser: { lowerCaseTags: false, lowerCaseAttributeNames: false, xmlMode: true },
  }).trim();
  return out.startsWith('<svg') ? out : null;
}
