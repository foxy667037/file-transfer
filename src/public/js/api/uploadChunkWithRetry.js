import uploadChunkOnce from "./uploadChunkOnce.js";
import { MAX_RETRIES, RETRY_BASE_MS } from "../config.js";

const uploadChunkWithRetry = async (uploadId, file, index) => {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await uploadChunkOnce(uploadId, file, index);
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES) {
        const wait = RETRY_BASE_MS * 2 ** (attempt - 1);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  throw lastErr;
};

export default uploadChunkWithRetry;
