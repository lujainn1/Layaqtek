import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// React Router doesn't reset scroll position on navigation like a
// traditional multi-page site does — without this, leftover scroll
// from one page (e.g. filling the profile-setup wizard) carries over
// to the next and can visually overlap the sticky navbar.
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
