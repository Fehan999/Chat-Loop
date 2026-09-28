import { useEffect } from "react";

const SUFFIX = "ChatLoop by Ehan Siddique";

// sets the browser tab title for a page, e.g. "Admin panel | ChatLoop by Ehan Siddique"
export const usePageTitle = (title) => {
  useEffect(() => {
    document.title = title
      ? `${title} | ${SUFFIX}`
      : `ChatLoop - Real-time Chat App by Ehan Siddique`;
  }, [title]);
};
