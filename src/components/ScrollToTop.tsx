import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Reset scroll position to top on route change
    // Use setTimeout to ensure DOM is ready after route change
    const timer = setTimeout(() => {
      window.scrollTo(0, 0);
      // Also reset any scrollable containers
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 0);

    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
};
