// a short fingerprint of the announcement's wording. editing the text makes a new
// version (so it pops up again), toggling it off and on again doesn't
export const announcementVersion = ({ title = "", text = "" } = {}) => {
  const source = `${title.trim()}|${text.trim()}`;
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) | 0;
  }
  return `a${(hash >>> 0).toString(36)}${source.length}`;
};
