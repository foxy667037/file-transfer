import bytesToHex from "./bytesToHex.js";

async function createSHA256Hex(blob) {
  const buf = await blob.arrayBuffer();

  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", buf);
    return bytesToHex(digest);
  }

  if (
    typeof hashwasm === "undefined" ||
    typeof hashwasm.sha256 !== "function"
  ) {
    throw new Error(
      "No SHA-256 implementation available. Load /vendor/sha256.umd.min.js or serve over HTTPS.",
    );
  }

  return hashwasm.sha256(new Uint8Array(buf));
}

export default createSHA256Hex;
