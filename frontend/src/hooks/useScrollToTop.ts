import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const useScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    const scrollToTop = () => window.scrollTo(0, 0);
    scrollToTop();
  }, [location]);
};
