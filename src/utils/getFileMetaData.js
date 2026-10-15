import fs from "node:fs";

const getFileMetaData = (fileMetaDataPath) => {
  let meta;
  try {
    meta = JSON.parse(fs.readFileSync(fileMetaDataPath, "utf8"));
  } catch (err) {
    console.error("Failed to read meta.json:", err);
    return res.status(500).json({ error: "Upload metadata corrupted" });
  }

  return meta;
};

export default getFileMetaData;