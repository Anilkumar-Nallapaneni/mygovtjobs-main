/** Lightweight placeholder while a lazy route chunk loads. */
export default function RoutePageFallback() {
  return (
    <div className="route-page-fallback" role="status" aria-live="polite" aria-busy="true">
      <div className="route-page-fallback__spinner" aria-hidden />
      <span className="route-page-fallback__label">Loading…</span>
    </div>
  );
}
