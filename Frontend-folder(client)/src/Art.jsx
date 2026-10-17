import { useEffect, useState } from "react";

const Person = ({ x, y, s = 1, pose = "up", fill = "#14091f", opacity = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill} stroke={fill} opacity={opacity}>
    <circle cx="0" cy="-21" r="5.5" stroke="none" />
    <path d="M-8 22 L-8 -10 Q-8 -15 0 -15 Q8 -15 8 -10 L8 22 Z" stroke="none" />
    {pose === "up" && (
      <>
        <line x1="-6" y1="-10" x2="-15" y2="-30" strokeWidth="3.6" strokeLinecap="round" />
        <line x1="6" y1="-10" x2="15" y2="-30" strokeWidth="3.6" strokeLinecap="round" />
      </>
    )}
    {pose === "dance" && (
      <>
        <line x1="-6" y1="-10" x2="-16" y2="-28" strokeWidth="3.6" strokeLinecap="round" />
        <line x1="6" y1="-10" x2="18" y2="2" strokeWidth="3.6" strokeLinecap="round" />
      </>
    )}
  </g>
);

const SCENES = {
  Gospel: () => (
    <>
      <defs>
        <linearGradient id="g-gospel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd86b" />
          <stop offset="0.5" stopColor="#b5651d" />
          <stop offset="1" stopColor="#2a1240" />
        </linearGradient>
        <radialGradient id="g-gospel-glow">
          <stop offset="0" stopColor="#fff6c9" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff6c9" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill="url(#g-gospel)" />
      <circle cx="50" cy="24" r="36" fill="url(#g-gospel-glow)" />
      {[8, 24, 40, 60, 76, 92].map((x) => (
        <polygon key={x} points={`50,4 ${x - 7},75 ${x + 7},75`} fill="#fff" opacity="0.13" />
      ))}
      <Person x={8} y={70} s={0.8} fill="#3b1d52" opacity={0.7} />
      <Person x={30} y={68} s={0.8} fill="#3b1d52" opacity={0.7} />
      <Person x={52} y={69} s={0.8} fill="#3b1d52" opacity={0.7} />
      <Person x={74} y={68} s={0.8} fill="#3b1d52" opacity={0.7} />
      <Person x={94} y={70} s={0.8} fill="#3b1d52" opacity={0.7} />
      <Person x={18} y={84} s={1.1} />
      <Person x={40} y={85} s={1.15} />
      <Person x={62} y={85} s={1.15} />
      <Person x={84} y={84} s={1.1} />
    </>
  ),

  Afrobeats: () => (
    <>
      <defs>
        <linearGradient id="g-afro" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff9a1f" />
          <stop offset="0.55" stopColor="#ff3d6e" />
          <stop offset="1" stopColor="#6a1b9a" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#g-afro)" />
      <circle cx="50" cy="38" r="22" fill="#ffe27a" opacity="0.85" />
      {[[12, 20], [84, 14], [90, 52], [8, 58], [70, 30], [28, 12]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={2.6} fill="#fff" opacity="0.7" />
      ))}
      <Person x={22} y={80} s={1.2} pose="dance" fill="#1a0a24" />
      <Person x={50} y={84} s={1.35} pose="up" fill="#1a0a24" />
      <Person x={78} y={80} s={1.2} pose="dance" fill="#1a0a24" />
    </>
  ),

  Ugandan: () => (
    <>
      <defs>
        <linearGradient id="g-ug" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd400" />
          <stop offset="0.55" stopColor="#ff6a1f" />
          <stop offset="1" stopColor="#5a1410" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#g-ug)" />
      <circle cx="42" cy="58" r="18" fill="#fff3a8" opacity="0.95" />
      <path d="M0 76 Q24 60 48 72 T100 66 L100 100 L0 100 Z" fill="#2a0d0b" />
      <path d="M0 88 Q30 78 60 86 T100 82 L100 100 L0 100 Z" fill="#180605" />
      <path d="M76 84 L78 52 L80 84 Z" fill="#120403" />
      <ellipse cx="79" cy="48" rx="18" ry="5.5" fill="#120403" />
      <ellipse cx="70" cy="53" rx="10" ry="4" fill="#120403" />
      <ellipse cx="90" cy="53" rx="8" ry="3.5" fill="#120403" />
    </>
  ),

  Kikkade: () => (
    <>
      <defs>
        <linearGradient id="g-kik" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d99a3c" />
          <stop offset="1" stopColor="#4a2410" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#g-kik)" />
      <circle cx="44" cy="54" r="38" fill="#0e0e0e" />
      {[32, 26, 20].map((r) => (
        <circle key={r} cx="44" cy="54" r={r} fill="none" stroke="#2c2c2c" strokeWidth="1.4" />
      ))}
      <circle cx="44" cy="54" r="12" fill="#e8a33d" />
      <circle cx="44" cy="54" r="2.4" fill="#0e0e0e" />
      <circle cx="90" cy="14" r="6" fill="#d9d9d9" />
      <line x1="90" y1="14" x2="62" y2="50" stroke="#e8e8e8" strokeWidth="3" strokeLinecap="round" />
      <rect x="55" y="46" width="12" height="7" rx="2" fill="#bdbdbd" transform="rotate(-48 61 50)" />
    </>
  ),

  Dancehall: () => (
    <>
      <defs>
        <linearGradient id="g-dh" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b3d1f" />
          <stop offset="1" stopColor="#070707" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#g-dh)" />
      <rect x="0" y="0" width="100" height="5" fill="#1db954" />
      <rect x="0" y="5" width="100" height="5" fill="#ffd400" />
      <rect x="0" y="10" width="100" height="5" fill="#e63946" />
      {[14, 58].map((x) => (
        <g key={x}>
          <rect x={x} y="28" width="28" height="66" rx="5" fill="#0d0d0d" stroke="#ffd400" strokeWidth="1.6" />
          <circle cx={x + 14} cy="40" r="5" fill="#1a1a1a" stroke="#2ee59d" strokeWidth="1.4" />
          <circle cx={x + 14} cy="69" r="13" fill="#1a1a1a" stroke="#2ee59d" strokeWidth="1.8" />
          <circle cx={x + 14} cy="69" r="5" fill="#2ee59d" opacity="0.8" />
        </g>
      ))}
      <path d="M46 52 Q50 56 46 60" stroke="#ffd400" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M50 48 Q56 56 50 64" stroke="#ffd400" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </>
  ),

  Amapiano: () => (
    <>
      <defs>
        <linearGradient id="g-ama" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7b2ff7" />
          <stop offset="1" stopColor="#00c6a7" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#g-ama)" />
      <circle cx="72" cy="26" r="14" fill="#fff" opacity="0.85" />
      {[18, 32, 46].map((cx, i) => (
        <circle key={cx} cx={cx} cy={30 - i * 4} r="2.4" fill="#fff" opacity="0.7" />
      ))}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <rect key={i} x={i * 12.5} y="58" width="12.5" height="42" fill="#f8f8ff" stroke="#222" strokeWidth="0.8" />
      ))}
      {[1, 2, 4, 5, 6].map((i) => (
        <rect key={i} x={i * 12.5 - 3.6} y="58" width="7.2" height="26" rx="1.5" fill="#111" />
      ))}
    </>
  ),

  "Old School": () => (
    <>
      <defs>
        <linearGradient id="g-old" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2b6cff" />
          <stop offset="1" stopColor="#ff4f9a" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#g-old)" />
      <rect x="10" y="24" width="80" height="54" rx="6" fill="#f2e6d0" stroke="#1a1a1a" strokeWidth="2" />
      <rect x="18" y="31" width="64" height="18" rx="3" fill="#fff" />
      <rect x="22" y="35" width="56" height="3" fill="#ff4f9a" />
      <rect x="22" y="41" width="40" height="3" fill="#2b6cff" />
      <rect x="22" y="54" width="56" height="16" rx="8" fill="#1a1a1a" />
      {[34, 66].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="62" r="6.5" fill="#f2e6d0" />
          <circle cx={cx} cy="62" r="2.2" fill="#1a1a1a" />
        </g>
      ))}
      <path d="M26 78 L32 70 L68 70 L74 78 Z" fill="#cdbf9f" stroke="#1a1a1a" strokeWidth="1.4" />
    </>
  ),

  Default: () => (
    <>
      <defs>
        <linearGradient id="g-def" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb800" />
          <stop offset="1" stopColor="#ff6a00" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#g-def)" />
      <text x="50" y="72" fontSize="60" textAnchor="middle" fill="#111">♪</text>
    </>
  ),
};

/*
  Real photos: put a picture named after the category in the public/categories folder
  (ugandan.jpg, kikkade.jpg, afrobeats.jpg, dancehall.jpg, amapiano.jpg, old-school.jpg, gospel.jpg).
  jpg, jpeg, png and webp all work. A category with no photo keeps its drawing.
*/
const PHOTO_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
const photoName = (category) => category.toLowerCase().replace(/\s+/g, "-");

export function CategoryArt({ category, className = "art" }) {
  const Scene = SCENES[category] || SCENES.Default;
  const [extIndex, setExtIndex] = useState(0);

  useEffect(() => {
    setExtIndex(0);
  }, [category]);

  return (
    <>
      <svg className={className} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`${category} artwork`}>
        <Scene />
      </svg>
      {extIndex < PHOTO_EXTENSIONS.length && (
        <img
          src={`/categories/${photoName(category)}.${PHOTO_EXTENSIONS[extIndex]}`}
          alt=""
          draggable="false"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={() => setExtIndex((i) => i + 1)}
        />
      )}
    </>
  );
}

export function DjAvatar({ className = "dj-svg" }) {
  return (
    <svg className={className} viewBox="0 0 100 100" role="img" aria-label="DJ Galanga">
      <defs>
        <linearGradient id="dj-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb800" />
          <stop offset="1" stopColor="#ff8a00" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#dj-bg)" />
      <path d="M12 100 Q14 72 50 70 Q86 72 88 100 Z" fill="#161622" />
      <rect x="41" y="56" width="18" height="18" rx="6" fill="#3a2013" />
      <ellipse cx="50" cy="42" rx="20" ry="23" fill="#4b2a18" />
      <path d="M30 36 Q32 16 50 16 Q68 16 70 36 Q62 28 50 28 Q38 28 30 36 Z" fill="#0d0d12" />
      <rect x="34" y="38" width="14" height="9" rx="4" fill="#0d0d12" />
      <rect x="52" y="38" width="14" height="9" rx="4" fill="#0d0d12" />
      <rect x="47" y="41" width="6" height="2.5" fill="#0d0d12" />
      <path d="M42 56 Q50 63 58 56" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M27 42 Q27 10 50 10 Q73 10 73 42" stroke="#f5f5f7" strokeWidth="5" fill="none" strokeLinecap="round" />
      <rect x="21" y="36" width="11" height="20" rx="5" fill="#ffb800" stroke="#111" strokeWidth="2" />
      <rect x="68" y="36" width="11" height="20" rx="5" fill="#ffb800" stroke="#111" strokeWidth="2" />
    </svg>
  );
}