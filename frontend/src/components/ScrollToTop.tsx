import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** SPA route changes keep scroll position — reset to top on pathname change. */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
