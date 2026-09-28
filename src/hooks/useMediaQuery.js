import { useEffect, useState } from "react";

export const useMediaQuery = (queryString) => {
  const [matches, setMatches] = useState(() => window.matchMedia(queryString).matches);

  useEffect(() => {
    const media = window.matchMedia(queryString);
    const onChange = () => setMatches(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [queryString]);

  return matches;
};

export const useIsMobile = () => useMediaQuery("(max-width: 767px)");

// true while the tab is in front, used to hold read receipts until the user
// can actually see the messages
export const usePageVisible = () => {
  const [visible, setVisible] = useState(() => !document.hidden);

  useEffect(() => {
    const onChange = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  return visible;
};
