// import required modules
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import express from "express";
import crypto from "node:crypto";
import process from "node:process";
import { configDotenv } from "dotenv";
import { Transform } from "node:stream";
import { fileURLToPath } from "node:url";
import { randomUUIDv7 } from "node:crypto";
import { pipeline } from "node:stream/promises";
import getLocalIps from "./utils/getLocalIps.js";
import assembleChunks from "./utils/assembleChunks.js";
import getFileMetaData from "./utils/getFileMetaData.js";

// loads env files and inject it.
configDotenv();
const localIPs = getLocalIps();

// important constant files and directory variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// constant variables and env
const fileCompletion = new Set();
const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || "0.0.0.0";
const MAX_FILE_SIZE = process.env.MAX_FILE_SIZE || 5 * 1024 * 1024 * 1024;
const DEFAULT_CHUNK_SIZE = process.env.DEFAULT_CHUNK_SIZE || 16 * 1024 * 1024;
const UUID_REGEX_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// pulic and upload directory
const PUBLIC_DIR = path.resolve(__dirname, "public");

const UPLOAD_DIR = path.resolve(__dirname, "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const TEMP_UPLOAD_DIR = path.resolve(__dirname, "temp_uploads");
fs.mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });

// server instance
const app = express();

// cors
const corsOptions = {
  origin: "http://192.168.0.118:5001",
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// --- Middleware ---
app.use((req, res, next) => {
  console.log(
    `[${new Date().toLocaleString()}] ::: ${req.method} ::: ${req.url}`,
  );

  next();
});

// --- Static UI ---
app.use(express.static(PUBLIC_DIR));
app.use("/dist", express.static(path.join(__dirname, "../dist")));

// testing routes: /api/, /api/ping
app.get("/api/status", (req, res) => {
  res.json({
    statusCode: 200,
    statusMessage: "Success",
    time: `[${new Date().toISOString()}]`,
    data: "Texmux Lan-Storage is Running.",
  });
});
app.get("/api/ping", (req, res) => {
  res.status(200).type("text/plain").send("pong.........");
});

// routes for file download, and list of files
app.get("/files/:fileName", async (req, res) => {
  const { fileName } = req.params;

  const safeFileName = path.basename(fileName);
  if (
    safeFileName !== fileName ||
    safeFileName === ".." ||
    safeFileName === "."
  ) {
    return res.status(400).json({ errorMsg: "Invalid filename" });
  }

  const filePath = path.resolve(UPLOAD_DIR, safeFileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ errorMsg: "File Not Found!" });
  }

  res.type("application/octet-stream");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${safeFileName}"`,
  );

  try {
    const fileStream = fs.createReadStream(filePath);
    await pipeline(fileStream, res);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ error: "Download failed" });
    } else {
      res.destroy();
    }
  }
});
app.get("/api/files", async (req, res) => {
  try {
    const listOFFiles = fs.readdirSync(UPLOAD_DIR);
    const filesDirectory = listOFFiles.map((file) => {
      const fullPathOFFile = path.resolve(UPLOAD_DIR, file);
      return {
        file_name: file,
        file_size: fs.statSync(fullPathOFFile).size,
      };
    });

    return res.status(200).json({ list_of_files: filesDirectory });
  } catch (error) {
    console.error("error at files list: ", error);
    res.status(500).json({ errorMsg: error });
  }
});

// updated: new upload route (upload pipeline)
app.post("/api/upload/init", express.json(), async (req, res) => {
  const { fileName, fileSize, totalChunks, eachChunkSize } = req.body ?? {};

  // file name validation
  if (typeof fileName !== "string" || fileName.length === 0) {
    return res.status(400).json({ error: "fileName is required" });
  }

  // safe filename validation
  const safeFileName = path.basename(fileName);
  if (
    safeFileName !== fileName ||
    safeFileName === ".." ||
    safeFileName === "."
  ) {
    return res.status(400).json({ errorMsg: "Invalid filename" });
  }

  // file size validation
  if (!Number.isInteger(fileSize)) {
    return res
      .status(400)
      .json({ error: "fileSize must be a positive integer" });
  }
  if (fileSize > MAX_FILE_SIZE || fileSize <= 0) {
    return res.status(400).json({ error: "fileSize must be 5 GB." });
  }

  // chunk size and total chunk validation
  if (
    !Number.isInteger(eachChunkSize) ||
    eachChunkSize <= 0 ||
    eachChunkSize > DEFAULT_CHUNK_SIZE
  ) {
    return res
      .status(400)
      .json({ error: "chunkSize must be a positive integer <= 4 MiB" });
  }
  if (!Number.isInteger(totalChunks) || totalChunks <= 0) {
    return res
      .status(400)
      .json({ error: "totalChunks must be a positive integer" });
  }

  // expected chunk vs what we got.
  const exprectedTotalChunks = Math.ceil(fileSize / eachChunkSize);
  if (totalChunks !== exprectedTotalChunks)
    return res.status(400).json({
      error: `totalChunks mismatch: expected ${exprectedTotalChunks}, got ${totalChunks}`,
    });

  // generate fileUploadID and create folder
  const fileUploadFolderId = randomUUIDv7();
  const fileUploadFolder = path.resolve(
    TEMP_UPLOAD_DIR,
    `${fileUploadFolderId}`,
  );
  fs.mkdirSync(fileUploadFolder, { recursive: true });

  // create metadata of file and store on the file specific upload folder
  const fileMetaData = {
    fileUploadId: fileUploadFolderId,
    fileName: fileName,
    fileSize: fileSize,
    chunkSize: eachChunkSize,
    totalChunks: totalChunks,
    createdAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    path.resolve(fileUploadFolder, "meta.json"),
    JSON.stringify(fileMetaData, null, 2),
  );

  // output of the upload api
  console.log(
    `Init upload ${fileUploadFolderId} for ${safeFileName} (${fileSize} bytes, ${totalChunks} chunks)`,
  );
  return res
    .status(201)
    .json({ fileUploadFolderId, safeFileName, eachChunkSize, totalChunks });
});
app.put("/api/upload/:uploadId/chunks/:chunkIndex", async (req, res) => {
  const hashRegex = /^[0-9a-f]{64}$/i;
  const expectedHash = req.get("X-Chunk-Hash");
  const { uploadId, chunkIndex: rawChunkIndex } = req.params;

  // check if file has specific id
  if (!UUID_REGEX_PATTERN.test(uploadId))
    return res.status(400).json({ error: "Invalid UploadId." });

  // check if chunkIndex is a number or not
  const chunkIndex = Number(rawChunkIndex);
  if (!Number.isInteger(chunkIndex) || chunkIndex < 0)
    return res.status(400).json({ error: "Invalid Chunk Index Number." });

  // check if we provide SHA256 hash algorithm name
  if (typeof expectedHash !== "string" || !hashRegex.test(expectedHash)) {
    return res.status(400).json({ error: "Missing or invalid X-Chunk-Hash" });
  }

  // check if file directory exist
  const uploadDir = path.resolve(TEMP_UPLOAD_DIR, uploadId);
  const fileMetaDataPath = path.resolve(uploadDir, "meta.json");
  if (!fs.existsSync(fileMetaDataPath))
    return res.status(404).json({ error: "Upload Directory Not Found." });

  // save file meta data
  const fileMetaData = getFileMetaData(fileMetaDataPath);
  if (chunkIndex >= fileMetaData.totalChunks) {
    return res.status(400).json({ error: "Chunk index out of range" });
  }

  // check chunk size
  const isLastChunk = chunkIndex === fileMetaData.totalChunks - 1;
  const expectedChunkSize = isLastChunk
    ? fileMetaData.fileSize -
      fileMetaData.chunkSize * (fileMetaData.totalChunks - 1)
    : fileMetaData.chunkSize;

  // stream chunk into upload folder while hashing
  const chunkPath = path.resolve(uploadDir, `${chunkIndex}.chunk`);
  const hash = crypto.createHash("SHA256");
  const hasher = new Transform({
    transform(chunk, _enc, cb) {
      hash.update(chunk);
      cb(null, chunk);
    },
  });

  let bytesWritten = 0;
  const counter = new Transform({
    transform(chunk, _enc, cb) {
      bytesWritten += chunk.length;
      cb(null, chunk);
    },
  });

  try {
    await pipeline(req, hasher, counter, fs.createWriteStream(chunkPath));
  } catch (err) {
    console.error(`Chunk ${chunkIndex} stream error:`, err);
    fs.rmSync(chunkPath, { force: true });
    return res.status(500).json({ error: "Failed to receive chunk" });
  }

  // size check
  if (bytesWritten != expectedChunkSize) {
    fs.rmSync(chunkPath, { force: true });
    return res.status(400).json({
      error: `Chunk size mismatch: expected ${expectedChunkSize}, got ${bytesWritten}`,
    });
  }

  // hash check
  const computedHash = hash.digest("hex");
  if (computedHash !== expectedHash.toLowerCase()) {
    fs.rmSync(chunkPath, { force: true });
    return res.status(400).json({
      error: "Chunk hash mismatch",
      expected: expectedHash.toLowerCase(),
      computed: computedHash,
    });
  }

  console.log(
    `Chunk ${chunkIndex}/${fileMetaData.totalChunks - 1} of ${uploadId} received (${bytesWritten} bytes)`,
  );
  res
    .status(200)
    .json({ uploadId, chunkIndex, bytes: bytesWritten, hash: computedHash });
});
app.get("/api/upload/:uploadId/status", async (req, res) => {
  const { uploadId } = req.params;

  // check if file has specific id
  if (!UUID_REGEX_PATTERN.test(uploadId))
    return res.status(400).json({ error: "Invalid UploadId." });

  // check if folder exist and file meta data exist
  const uploadDir = path.resolve(TEMP_UPLOAD_DIR, `${uploadId}`);
  const fileMetaDataPath = path.resolve(uploadDir, "meta.json");
  if (!fs.existsSync(fileMetaDataPath))
    return res.status(400).json({ error: "File Folder Not Found." });

  // save file meta data
  const fileMetaData = getFileMetaData(fileMetaDataPath);

  // get list of chunks to identify missed or completed
  const listOfChunks = await fs.promises.readdir(uploadDir);

  // identify completed list of chunks
  const receivedListOfChunks = [];
  for (const chunk of listOfChunks) {
    const chunkNameMatchRegx = chunk.match(/^(\d+)\.chunk$/);
    if (!chunkNameMatchRegx) continue;
    const chunkIdx = Number(chunkNameMatchRegx[1]);
    if (chunkIdx >= 0 && chunkIdx < fileMetaData.totalChunks)
      receivedListOfChunks.push(chunkIdx);
  }
  receivedListOfChunks.sort((a, b) => a - b);

  // compare received list of chunks with total chunks, if not then add in missing chunk list
  const receivedListOfChunksSet = new Set(receivedListOfChunks);
  const missingListOfChunks = [];
  for (let idx = 0; idx < fileMetaData.totalChunks; idx++) {
    if (!receivedListOfChunksSet.has(idx)) missingListOfChunks.push(idx);
  }

  // send number of completed chunks and number of missing chunks
  res.json({
    uploadId,
    fileName: fileMetaData.fileName,
    totalChunks: fileMetaData.totalChunks,
    receivedChunks: receivedListOfChunks,
    missingChunks: missingListOfChunks,
    complete: missingListOfChunks.length === 0,
  });
});
app.post("/api/upload/:uploadId/complete", async (req, res) => {
  const { uploadId } = req.params;

  // check if file has specific id
  if (!UUID_REGEX_PATTERN.test(uploadId)) {
    return res.status(400).json({ error: "Invalid uploadId" });
  }

  // if the malicious person use this api two time concurrently
  if (fileCompletion.has(uploadId)) {
    return res
      .status(409)
      .json({ error: "File Completion is already in progress" });
  }

  fileCompletion.add(uploadId);

  try {
    // check file folder and its meta data file
    const uploadDir = path.resolve(TEMP_UPLOAD_DIR, `${uploadId}`);
    const fileMetaDataPath = path.resolve(uploadDir, "meta.json");
    if (!fs.existsSync(fileMetaDataPath))
      return res.status(400).json({ error: "File Folder Not Found." });

    // save file meta data
    const fileMetaData = getFileMetaData(fileMetaDataPath);

    // Verify every chunk is present
    for (let idx = 0; idx < fileMetaData.totalChunks; idx++) {
      const chunkPath = path.resolve(uploadDir, `${idx}.chunk`);
      if (!fs.existsSync(chunkPath)) {
        return res.status(409).json({
          error: "Not all chunks received",
          missingChunk: i,
        });
      }
    }

    // define assembled chunk path
    const assembledChunkPath = path.resolve(uploadDir, "assembledChunk.bin");
    const finalFilePath = path.join(UPLOAD_DIR, fileMetaData.fileName);

    // assembled the chunks
    let fileHash;
    try {
      fileHash = await assembleChunks(
        uploadDir,
        fileMetaData,
        assembledChunkPath,
      );
    } catch (error) {
      console.error("Assembly failed:", err);
      fs.rmSync(assembledChunkPath, { force: true });
      return res.status(500).json({ error: "Failed to assemble file" });
    }

    // check assembled file size
    const assembledSize = fs.statSync(assembledChunkPath).size;
    if (assembledSize !== fileMetaData.fileSize) {
      fs.rmSync(assembledChunkPath, { force: true });
      return res.status(500).json({
        error: `Assembled size mismatch: expected ${fileMetaData.fileSize}, got ${assembledSize}`,
      });
    }

    // Automatically move into uploads/
    try {
      fs.renameSync(assembledChunkPath, finalFilePath);
    } catch (err) {
      console.error("Rename failed:", err);
      fs.rmSync(assembledChunkPath, { force: true });
      return res.status(500).json({ error: "Failed to finalize file" });
    }

    // Cleanup temp-upload-folder of file based on id
    try {
      fs.rmSync(uploadDir, { recursive: true, force: true });
    } catch (err) {
      console.warn(`Cleanup failed for ${uploadId}:`, err.message);
    }

    console.log(
      `Completed upload ${uploadId} -> ${fileMetaData.fileName} (${fileMetaData.fileSize} bytes, sha256=${fileHash.slice(0, 12)}…)`,
    );

    res.status(201).json({
      fileName: fileMetaData.fileName,
      fileSize: fileMetaData.fileSize,
      fileHash,
    });
  } finally {
    fileCompletion.delete(uploadId);
  }
});
app.delete("/api/upload/:uploadId", async (req, res) => {
  const { uploadId } = req.params;
  const deleteFolderPath = path.resolve(TEMP_UPLOAD_DIR, uploadId);
  const regex =
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (regex.test(uploadId))
    return res.status(400).json({ error: "Invalid UploadId." });

  if (!fs.existsSync(deleteFolderPath))
    return res.status(404).json({ msg: "Folder Not Found" });

  try {
    await fs.promises.rm(deleteFolderPath, { recursive: true, force: true });
    console.log(`Deleted upload workspace ${uploadId}`);
    return res.status(204).end();
  } catch (err) {
    console.error("Failed to delete upload workspace:", err);
    return res.status(500).json({ error: "Failed to delete upload workspace" });
  }
});

// defines that server accepts request on that port
const server = app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
  console.log(`Upload dir: ${UPLOAD_DIR}`);
  console.log(`Public dir: ${PUBLIC_DIR}`);

  console.log("\n--- Network Interfaces ---");
  localIPs.forEach(({ iface, address }) => {
    console.log(`  ${iface}: http://${address}:${PORT}`);
  });
  console.log("--------------------------\n");
});

// Allow slow, large uploads over local Wi-Fi.
server.requestTimeout = 0;
server.headersTimeout = 60_000;
server.keepAliveTimeout = 65_000;