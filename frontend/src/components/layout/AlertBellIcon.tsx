/** Premium notification bell — glow backdrop, badge pulse, job-alert styling. */
export default function AlertBellIcon({ size = 64, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`alert-bell-icon ${className}`.trim()}
      aria-hidden
    >
      <defs>
        <radialGradient id="alert-bell-glow" cx="50%" cy="42%" r="52%">
          <stop stopColor="#FF8C35" stopOpacity="0.55" />
          <stop offset="0.55" stopColor="#FF6B00" stopOpacity="0.18" />
          <stop offset="1" stopColor="#FF6B00" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="alert-bell-plate" x1="12" y1="12" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2A2118" />
          <stop offset="1" stopColor="#1A1510" />
        </linearGradient>
        <linearGradient id="alert-bell-metal" x1="20" y1="18" x2="44" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFD08A" />
          <stop offset="0.35" stopColor="#FF8C35" />
          <stop offset="0.72" stopColor="#FF6B00" />
          <stop offset="1" stopColor="#D94E00" />
        </linearGradient>
        <linearGradient id="alert-bell-badge" x1="42" y1="10" x2="56" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF5A5F" />
          <stop offset="1" stopColor="#E02020" />
        </linearGradient>
        <filter id="alert-bell-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#FF6B00" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Ambient glow */}
      <circle cx="32" cy="32" r="30" fill="url(#alert-bell-glow)" />

      {/* Icon plate */}
      <circle cx="32" cy="32" r="24" fill="url(#alert-bell-plate)" stroke="rgba(255,140,53,0.45)" strokeWidth="1.25" />

      {/* Ring arcs */}
      <path
        d="M13 27.5c0-2.2 1.2-4.1 3-5.1"
        stroke="#FF8C35"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M51 27.5c0-2.2-1.2-4.1-3-5.1"
        stroke="#FF8C35"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M10.5 31.5c0-3.4 1.8-6.4 4.5-8"
        stroke="#FFB347"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.35"
      />
      <path
        d="M53.5 31.5c0-3.4-1.8-6.4-4.5-8"
        stroke="#FFB347"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.35"
      />

      {/* Bell */}
      <g filter="url(#alert-bell-soft)">
        <path
          d="M32 17.5c-5.8 0-10.5 4.7-10.5 10.5v6.8c0 1.6-.5 3.1-1.5 4.4l-1.1 1.4h26.2l-1.1-1.4a7.4 7.4 0 0 1-1.5-4.4v-6.8c0-5.8-4.7-10.5-10.5-10.5Z"
          fill="url(#alert-bell-metal)"
        />
        <path
          d="M25.5 24.5c1-3.6 4.2-6 8-5.7"
          stroke="#FFF4E5"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path d="M32 39.2v3.1" stroke="#B84A00" strokeWidth="2.2" strokeLinecap="round" />
        <rect x="25.5" y="42.8" width="13" height="4.8" rx="2.4" fill="#FFB347" stroke="#C44F00" strokeWidth="1.2" />
      </g>

      {/* Sparkles */}
      <path
        d="M18 20.5 19 23l2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5Z"
        fill="#FFE8B8"
        opacity="0.9"
      />
      <path
        d="M46.5 38.5 47.2 40.4l1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7.7-1.9Z"
        fill="#FFD699"
        opacity="0.75"
      />

      {/* Badge pulse ring */}
      <circle className="alert-bell-icon__pulse" cx="47" cy="17" r="11" stroke="#FF5A5F" strokeWidth="1.5" opacity="0.45" />

      {/* Notification badge */}
      <circle cx="47" cy="17" r="8.5" fill="url(#alert-bell-badge)" stroke="#fff" strokeWidth="2" />
      <path
        d="M47 13.2v4.6M47 19.8v.2"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
