const formatBytes = (bytes) => {
  if (bytes <= 1024) return `${bytes} B`;
  if (bytes <= 1048576) return `${bytes} KB`;
  if (bytes <= 1073741824) return `${bytes} MB`;

  return `${(bytes / 1073741824).toFixed(2)} GB`;
};

export default formatBytes;
