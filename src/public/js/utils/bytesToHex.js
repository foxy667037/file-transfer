const bytesToHex = (buf) => {
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

export default bytesToHex;
