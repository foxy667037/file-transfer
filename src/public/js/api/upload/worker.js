import uploadChunkWithRetry from "../uploadChunkWithRetry.js"

const worker = async (queue, uploadId, file, onChunkDone)=> {
  while (queue.length > 0) {
    const index = queue.shift();
    if (index === undefined) return;
    await uploadChunkWithRetry(uploadId, file, index);
    onChunkDone(index);
  }
}

export default worker;