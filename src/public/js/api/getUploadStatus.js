const getUploadStatus = async (uploadId) => {
  const res = await fetch(`/api/upload/${encodeURIComponent(uploadId)}/status`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `status failed: HTTP ${res.status}`);
  }
  return res.json();
};

export default getUploadStatus;