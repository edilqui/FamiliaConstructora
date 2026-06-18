import { useState, useEffect, useRef, useLayoutEffect } from 'react';

/**
 * Hides the header when scrolling down and shows it when scrolling up.
 * Returns a ref to put on the <header> element, the hidden state,
 * and the measured spacer height (so fixed-position headers don't overlap content).
 */
export function useScrollAwareHeader(threshold = 60) {
  const [hidden, setHidden] = useState(false);
  const [spacerHeight, setSpacerHeight] = useState(0);
  const headerRef = useRef<HTMLElement>(null);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    setSpacerHeight(header.offsetHeight);

    const ro = new ResizeObserver(() => {
      setSpacerHeight(header.offsetHeight);
    });
    ro.observe(header);
    return () => ro.disconnect();
  }, []);

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
