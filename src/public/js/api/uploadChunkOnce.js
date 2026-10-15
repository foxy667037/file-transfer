import { CHUNK_SIZE } from "../config.js";
import createSHA256Hex from "../utils/createSHA256Hash.js";

const uploadChunkOnce = async (uploadId, file, index) => {
  const start = index * CHUNK_SIZE;
  const end = Math.min(start + CHUNK_SIZE, file.size);
  const blob = file.slice(start, end);
  const hash = await createSHA256Hex(blob);

  const res = await fetch(
    `/api/upload/${encodeURIComponent(uploadId)}/chunks/${index}`,
    {
      method: "PUT",
      headers: { "X-Chunk-Hash": hash },
      body: blob,
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `chunk ${index} failed: HTTP ${res.status}`);
  }
  return res.json();
};

export default uploadChunkOnce;
