import * as React from "react";
import { useLocation } from "react-router-dom";

/** Resets scroll position to the top on every route change. */
export function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);
  return null;
}
