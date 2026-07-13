type NavIconProps = {
  className?: string;
};

export function NavIconHome({ className }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 10.5 12 3l8 7.5" />
      <path d="M6 10v10h12V10" />
    </svg>
  );
}

export function NavIconExplore({ className }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="m14.5 9.5-5 5" />
      <path d="M9.5 9.5h5v5" />
    </svg>
  );
}

export function NavIconLatest({ className }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 6h16M4 10h16M4 14h10M4 18h8" />
    </svg>
  );
}

export function NavIconResults({ className }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 15V9M12 15V7M16 15v-4" />
    </svg>
  );
}

export function NavIconAdmit({ className }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M9 9h6M9 13h4" />
    </svg>
  );
}
