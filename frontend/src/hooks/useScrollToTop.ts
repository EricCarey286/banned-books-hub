import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Custom hook that automatically scrolls to the top of the page when the route changes.
 * Includes debouncing to prevent scroll jank during rapid navigation.
 */
export function useScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    // Use setTimeout to allow the DOM to render before scrolling
    const timeoutId = setTimeout(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'auto', // instant scroll, not smooth (better UX for navigation)
      });
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [location.pathname]); // Only trigger on pathname change, not other location changes
}
