import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pipeline } from "node:stream/promises";
import { Transform, Readable } from "node:stream";

const assembleChunks = async (
  chunkUploadDir,
  fileMetaData,
  destinationPath,
) => {
  const hash = crypto.createHash("SHA256");
  const hasher = new Transform({
    transform(chunk, _enc, cb) {
      hash.update(chunk);
      cb(null, chunk);
    },
  });

  async function* readChunks() {
    for (let index = 0; index < fileMetaData.totalChunks; index++) {
      const chunkPath = path.resolve(chunkUploadDir, `${index}.chunk`);
      const chunkStream = fs.createReadStream(chunkPath);
      for await (const chunk of chunkStream) {
        yield chunk;
      }
    }
  }

  await pipeline(
    Readable.from(readChunks()),
    hasher,
    fs.createWriteStream(destinationPath),
  );

  return hash.digest("hex")
};

export default assembleChunks;
