/** Bubbly magnifying glass — light blue lens, purple handle. */
export default function SearchMagnifyIcon({ size = 18, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`search-magnify-icon ${className}`.trim()}
      aria-hidden
    >
      <circle cx="10.25" cy="10.25" r="6.5" fill="#72C8F7" stroke="#2C2C34" strokeWidth="1.5" />
      <circle cx="9.1" cy="8.85" r="2.2" fill="#B8E6FF" opacity="0.75" />
      <path
        d="M14.8 14.8C15.6 15.6 16.8 16.8 18.2 18.2"
        stroke="#5E3D8C"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <path
        d="M14.8 14.8C15.6 15.6 16.8 16.8 18.2 18.2"
        stroke="#2C2C34"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
