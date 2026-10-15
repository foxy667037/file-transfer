const downloadFile = (fileName) => {
  const link = document.createElement("a");
  link.href = `/files/${encodeURIComponent(fileName)}`;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default downloadFile;
