const completeUpload = async (uploadId) => {
  const res = await fetch(
    `/api/upload/${encodeURIComponent(uploadId)}/complete`,
    { method: "POST" },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `complete failed: HTTP ${res.status}`);
  }
  
  return res.json();
};

export default completeUpload;