'use client';
import { createContext, useContext } from 'react';

const Ctx = createContext({ enabled: true, messages: {} });
export function MascotProvider({ enabled = true, messages = {}, children }) {
  return <Ctx.Provider value={{ enabled, messages }}>{children}</Ctx.Provider>;
}
export const useMascot = () => useContext(Ctx);

const INK = '#1D2A26', CHALK = '#FFFDF3';
const Arm = ({ d, hx, hy, cls }) => (
  <g className={cls}>
    <path d={d} fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
    <circle cx={hx} cy={hy} r="7" fill={CHALK} stroke={INK} strokeWidth="4" />
  </g>
);
const Eye = ({ x, rx = 5, ry = 7 }) => (
  <g className="m-eye"><ellipse cx={x} cy="98" rx={rx} ry={ry} fill={INK} /><circle cx={x + 1.6} cy={98 - ry / 2.2} r="2" fill="#fff" /></g>
);
const Arc = ({ x }) => <path d={`M${x - 7} 101 Q${x} 90 ${x + 7} 101`} fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />;

/** Κιμωλάκης – ο επίσημος μασκότ. Διαφορετικές διαθέσεις/πόζες, κινούμενα μέρη με CSS. */
export default function Mascot({ mood = 'happy', size = 160, className = '', title }) {
  const { enabled } = useMascot();
  if (!enabled) return null;
  const arc = mood === 'celebrate';
  const mouth = {
    happy: <path d="M88 120 Q100 134 112 120" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />,
    wave: <path d="M86 118 Q100 142 114 118 Z" fill="#D6453D" stroke={INK} strokeWidth="4" strokeLinejoin="round" />,
    celebrate: <path d="M82 116 Q100 148 118 116 Z" fill="#D6453D" stroke={INK} strokeWidth="4" strokeLinejoin="round" />,
    confused: <path d="M86 127 q7 -8 14 0 t14 0" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />,
    reading: <path d="M94 124 Q100 129 106 124" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />,
    phone: <path d="M88 120 Q100 134 112 120" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />,
    work: <path d="M90 124 Q100 130 110 124" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />,
    oops: <path d="M88 131 Q100 119 112 131" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />,
  }[mood] || null;
  return (
    <svg className={`mascot ${className}`} viewBox="0 0 200 250" width={size} height={size * 1.25} role="img" aria-label={title || 'Κιμωλάκης, ο μασκότ μας'}>
      <ellipse cx="100" cy="238" rx="50" ry="8" fill="rgba(0,0,0,.14)" />
      <g className="m-float">
        <path d="M84 200 L80 228 M116 200 L120 228" stroke={INK} strokeWidth="6" strokeLinecap="round" />
        <ellipse cx="75" cy="232" rx="12" ry="6" fill={INK} /><ellipse cx="125" cy="232" rx="12" ry="6" fill={INK} />
        {/* σώμα-κιμωλία */}
        <rect x="58" y="36" width="84" height="170" rx="30" fill={CHALK} stroke={INK} strokeWidth="5" />
        <path d="M70 62 Q65 120 72 176" fill="none" stroke="#EDE5CC" strokeWidth="7" strokeLinecap="round" />
        <rect x="58" y="152" width="84" height="30" fill="#1FA0FF" stroke={INK} strokeWidth="5" />
        <path d="M70 167 h18 M96 167 h8" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".8" />
        <circle cx="76" cy="52" r="1.8" fill="#cfc7ae" /><circle cx="124" cy="60" r="1.5" fill="#cfc7ae" /><circle cx="108" cy="46" r="1.3" fill="#cfc7ae" />
        {/* πρόσωπο */}
        <circle cx="74" cy="118" r="8" fill="#FF9FA3" opacity=".65" /><circle cx="126" cy="118" r="8" fill="#FF9FA3" opacity=".65" />
        {arc ? (<><Arc x={84} /><Arc x={116} /></>) : mood === 'confused' ? (<><Eye x={84} rx={6.5} ry={8.5} /><Eye x={116} rx={4} ry={5} /><path d="M76 84 L92 89 M108 87 L124 82" stroke={INK} strokeWidth="4" strokeLinecap="round" /></>)
          : mood === 'reading' ? (<><Eye x={84} ry={3.6} /><Eye x={116} ry={3.6} /></>)
          : mood === 'oops' ? (<><Eye x={84} /><Eye x={116} /><path d="M75 90 L92 83 M108 83 L125 90" stroke={INK} strokeWidth="4" strokeLinecap="round" /><path d="M78 110 q-5 9 0 12 q5 -3 0 -12z" fill="#7FD3FF" stroke={INK} strokeWidth="2" /></>)
          : (<><Eye x={84} /><Eye x={116} /></>)}
        {mouth}
        {/* χέρια και αξεσουάρ */}
        {mood === 'celebrate' ? (<><Arm d="M58 112 Q30 94 30 60" hx={30} hy={56} cls="m-cheer" /><Arm d="M142 112 Q170 94 170 60" hx={170} hy={56} cls="m-cheer" /></>)
          : mood === 'wave' ? (<><Arm d="M58 120 Q38 132 36 158" hx={36} hy={162} /><Arm d="M142 112 Q170 98 172 68" hx={172} hy={62} cls="m-wave" /></>)
          : mood === 'reading' ? (<>
              <rect x="52" y="146" width="96" height="64" rx="4" fill="#fff" stroke={INK} strokeWidth="4" />
              <rect x="60" y="153" width="80" height="12" fill="#E5231B" /><path d="M60 175 h38 M60 183 h38 M60 191 h30 M106 175 h34 M106 183 h34 M106 191 h34" stroke="#9aa5a1" strokeWidth="3" strokeLinecap="round" />
              <Arm d="M58 120 Q40 150 56 170" hx={56} hy={172} /><Arm d="M142 120 Q160 150 144 170" hx={144} hy={172} /></>)
          : mood === 'confused' ? (<><Arm d="M58 120 Q38 132 36 158" hx={36} hy={162} /><Arm d="M142 118 Q172 100 142 68" hx={140} hy={64} />
              <text className="m-q" x="160" y="44" fontSize="40" fontWeight="800" fill="#FFC21F" stroke={INK} strokeWidth="2.5" fontFamily="sans-serif">?</text></>)
          : mood === 'phone' ? (<><Arm d="M58 120 Q38 132 36 158" hx={36} hy={162} />
              <g transform="rotate(-8 152 158)"><rect x="138" y="128" width="30" height="50" rx="6" fill="#2b2f3a" stroke={INK} strokeWidth="3" /><rect x="142" y="134" width="22" height="34" rx="2" fill="#8EE3F0" />
              <path d="M146 138h6v6h-6z M156 138h6v6h-6z M146 148h6v6h-6z M156 156h4v4h-4z M152 150h3v3h-3z" fill="#1D2A26" /></g>
              <Arm d="M142 120 Q166 138 150 160" hx={150} hy={162} /></>)
          : mood === 'work' ? (<><Arm d="M58 120 Q38 132 36 158" hx={36} hy={162} />
              <path d="M170 70 L184 28" stroke="#9aa5ad" strokeWidth="9" strokeLinecap="round" /><circle cx="185" cy="24" r="10" fill="none" stroke="#9aa5ad" strokeWidth="7" strokeDasharray="44 20" />
              <Arm d="M142 118 Q168 112 170 74" hx={170} hy={72} cls="m-hammer" />
              <path d="M60 46 Q100 -4 140 46 Z" fill="#FFC21F" stroke={INK} strokeWidth="5" strokeLinejoin="round" /><rect x="52" y="42" width="96" height="11" rx="5.5" fill="#FFC21F" stroke={INK} strokeWidth="5" /></>)
          : mood === 'oops' ? (<><Arm d="M58 122 Q46 150 50 176" hx={50} hy={180} /><Arm d="M142 122 Q154 150 150 176" hx={150} hy={180} /></>)
          : (<><Arm d="M58 120 Q38 132 36 158" hx={36} hy={162} /><Arm d="M142 120 Q162 132 164 158" hx={164} hy={162} /></>)}
      </g>
      {mood === 'celebrate' && (<g className="m-conf">
        <path className="m-pop" d="M20 30 l4 9 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -1z" fill="#FFC21F" stroke={INK} strokeWidth="2" />
        <path className="m-pop d2" d="M170 24 l3 7 7 1 -5 5 2 7 -7 -4 -6 4 2 -7 -5 -5 7 -1z" fill="#00C8E0" stroke={INK} strokeWidth="2" />
        <circle className="m-pop d3" cx="100" cy="14" r="5" fill="#E5231B" /><rect className="m-pop d2" x="52" y="14" width="9" height="9" fill="#9B2CFF" transform="rotate(20 56 18)" /></g>)}
    </svg>
  );
}

/** Κιμωλάκης με φυσαλίδα· το μήνυμα προέρχεται από τα επεξεργάσιμα μηνύματα (k) ή από το text. */
export function MascotSay({ mood = 'happy', k, text, size = 120, className = '', children }) {
  const { enabled, messages } = useMascot();
  const msg = text ?? messages[k] ?? '';
  return (
    <div className={`say ${className}`} role="status">
      {enabled && <Mascot mood={mood} size={size} />}
      <div className="say-bubble"><p>{msg}</p>{children}</div>
    </div>
  );
}
