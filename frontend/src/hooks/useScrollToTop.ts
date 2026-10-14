import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// Scroll position per history entry, so back/forward can restore it (FR-008).
const scrollPositions = new Map<string, number>();

export const useScrollToTop = () => {
  const location = useLocation();
  const navigationType = useNavigationType();

  // Remember the scroll position for the current history entry
  useEffect(() => {
    const onScroll = () => scrollPositions.set(location.key, window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [location.key]);

  // Back/forward restores the saved position; link navigation scrolls to top
  useEffect(() => {
    if (navigationType === 'POP') {
      window.scrollTo(0, scrollPositions.get(location.key) ?? 0);
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.key, navigationType]);
};
