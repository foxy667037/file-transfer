import { CHUNK_SIZE } from "../config.js";

const initUpload = async (file) => {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const result = await fetch("/api/upload/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      eachChunkSize: CHUNK_SIZE,
      totalChunks,
    }),
  });

  if (!result.ok) {
    const err = await result.json().catch(() => ({}));
    throw new Error(err.error || `init failed: HTTP ${res.status}`);
  }
  
  const jsonRes = await result.json();
  return jsonRes;
};

export default initUpload;
