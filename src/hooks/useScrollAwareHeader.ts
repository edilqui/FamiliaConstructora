import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';

/**
 * Hides the header when scrolling down and shows it when scrolling up.
 * Uses a callback ref so measurement works even when the header renders
 * after an initial loading/empty state.
 */
export function useScrollAwareHeader(threshold = 60) {
  const [hidden, setHidden] = useState(false);
  const [spacerHeight, setSpacerHeight] = useState(0);
  const [headerEl, setHeaderEl] = useState<HTMLElement | null>(null);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const headerRef = useCallback((el: HTMLElement | null) => {
    setHeaderEl(el);
  }, []);

  useLayoutEffect(() => {
    if (!headerEl) return;
    setSpacerHeight(headerEl.offsetHeight);
    const ro = new ResizeObserver(() => {
      setSpacerHeight(headerEl.offsetHeight);
    });
    ro.observe(headerEl);
    return () => ro.disconnect();
  }, [headerEl]);

  useEffect(() => {
    const handleScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        if (currentScrollY > lastScrollY.current && currentScrollY > threshold) {
          setHidden(true);
        } else if (currentScrollY < lastScrollY.current) {
          setHidden(false);
        }
        lastScrollY.current = currentScrollY;
        ticking.current = false;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return { hidden, spacerHeight, headerRef };
}
