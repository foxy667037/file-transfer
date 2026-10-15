import worker from "./worker.js";
import initUpload from "../initUpload.js";
import { MAX_PARALLEL } from "../../config.js";
import completeUpload from "../completeUpload.js";
import getUploadStatus from "../getUploadStatus.js";

export async function uploadFile(file, onProgress = () => {}) {
  const { fileUploadFolderId } = await initUpload(file);

  const status = await getUploadStatus(fileUploadFolderId);
  const queue = [...status.missingChunks];
  const totalToSend = queue.length;
  let done = 0;

  if (totalToSend === 0) {
    onProgress({ done: 0, total: 0, chunkIndex: null });
    return completeUpload(fileUploadFolderId);
  }

  const onChunkDone = (index) => {
    done += 1;
    onProgress({ done, total: totalToSend, chunkIndex: index });
  };

  const workerCount = Math.min(MAX_PARALLEL, queue.length);
  await Promise.all(
    Array.from({ length: workerCount }, () =>
      worker(queue, fileUploadFolderId, file, onChunkDone),
    ),
  );

  return completeUpload(fileUploadFolderId);
}
