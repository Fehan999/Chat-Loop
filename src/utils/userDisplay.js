// fallback avatar so we never render a broken image
export const avatarFor = (user) => {
  if (user?.avatar) return user.avatar;
  if (user?.photoURL) return user.photoURL;
  const name = encodeURIComponent(user?.name || user?.displayName || "User");
  return `https://ui-avatars.com/api/?name=${name}&background=6366f1&color=fff&bold=true&size=128`;
};

// usernames were saved with and without the "@", show them the same way
export const formatUsername = (username) => {
  if (!username) return "";
  return username.startsWith("@") ? username : `@${username}`;
};

export const displayName = (user) =>
  user?.name || user?.displayName || user?.email?.split("@")[0] || "User";
