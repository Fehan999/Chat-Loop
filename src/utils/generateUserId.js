// the 4 digit public id people can search for in "Add friend".
// it isn't guaranteed unique, the uid is what actually identifies a user
export const generateUniqueIdWithTimestamp = () => {
  const timestamp = Date.now() % 10000;
  const random = Math.floor(Math.random() * 10000);
  return ((timestamp + random) % 10000).toString().padStart(4, "0");
};
