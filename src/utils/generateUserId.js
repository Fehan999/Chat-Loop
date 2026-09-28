// Generate a unique 4-digit ID
export const generateUniqueId = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Generate with timestamp to ensure uniqueness
export const generateUniqueIdWithTimestamp = () => {
  const timestamp = Date.now().toString().slice(-4);
  const random = Math.floor(100 + Math.random() * 900).toString();
  return (parseInt(timestamp) + parseInt(random)).toString().slice(-4);
};
