# Termux LAN Storage

An offline, hotspot-based file transfer server. Runs in Termux on Android
(or on any machine with Node.js). Other devices on the same Wi-Fi or hotspot
open a browser and upload/download files — no internet required.

## Status

**Working:**
- Chunked uploads (4 MiB chunks, up to 6 in parallel)
- Per-chunk SHA-256 verification and retry with exponential backoff
- Resume support (in-progress chunks survive server restarts)
- Native browser download (streamed, no Blob buffering)
- Web UI: file list, upload progress, download links

**Not yet implemented:**
- Authentication or permissions
- HTTPS / TLS (uses plain HTTP)
- Admin dashboard (connected clients, transfer history)
- Automatic cleanup of abandoned upload workspaces
- Disk quotas

## Requirements

- **Node.js 20+** (LTS). Termux: `pkg install nodejs-lts`
- **npm 10+** (bundled with Node.js)
- A phone or PC with Wi-Fi / hotspot capability

## Install

```bash
git clone <your-repo-url> file share
cd termux-lan-storage
npm install
cp .env.example .env
```

Edit `.env` and set `HOST=0.0.0.0` so other devices can reach the server.
The default `.env.example` already has this.

## Run

**Development** (auto-restart on file changes):

```bash
npm run dev
```

**Production-ish** (single run):

```bash
npm start
```

The server prints its address at startup:

```
Server running at http://0.0.0.0:5001
--- Network Interfaces ---
  wlan0: http://192.168.0.118:5001
--------------------------
```

Open the **second** URL (the LAN one, not `0.0.0.0`) in a browser on any
device connected to the same Wi-Fi or hotspot.

## Running in Termux (Android)

```bash
pkg update && pkg upgrade -y
pkg install nodejs-lts git -y

git clone <your-repo-url> file share
cd termux-lan-storage
npm install
cp .env.example .env

# Get your phone's IP on the hotspot / Wi-Fi
ifconfig wlan0    # or: ip addr show wlan0

npm run dev
```

Other devices on the same network open `http://<phone-ip>:5001`.

**Tip:** to keep the server running when Termux is backgrounded, run
`termux-wake-lock` before `npm run dev`. Release with
`termux-wake-unlock` when done.

## Running on Windows

Same steps as Termux, minus the `pkg` commands. Install Node.js from
<https://nodejs.org> (LTS).

Windows-specific notes:

- **Allow Node.js through the firewall** the first time Windows prompts.
  Choose "Private networks." If you missed the prompt, add an inbound
  rule for TCP port 5001.
- **Find your IP** with `ipconfig`. Use the IPv4 address of your active
  adapter (Wi-Fi or Ethernet).
- **Windows Defender** real-time scanning slows large uploads. Add the
  project folder to exclusions for a measurable speed-up:
  Windows Security → Virus & threat protection → Manage settings →
  Exclusions → Add folder.

## Configuration

All settings live in `.env`:

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `5001` | TCP port the server listens on |
| `HOST` | `127.0.0.1` | Bind address. Use `0.0.0.0` to accept LAN connections |
| `MAX_FILE_SIZE` | `5368709120` (5 GiB) | Reject uploads larger than this |
| `DEFAULT_CHUNK_SIZE` | `4194304` (4 MiB) | Chunk size for chunked uploads |
| `MAX_PARALLEL_CHUNKS` | `6` | Client-side concurrent chunk uploads (client reads this from the status endpoint once implemented) |

## API

All JSON endpoints live under `/api`. Binary downloads live under `/files`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/status` | Server status + timestamp |
| `GET` | `/api/files` | List of completed files with sizes |
| `POST` | `/api/upload?fileName=<name>` | Simple single-stream upload (no chunking) |
| `GET` | `/files/:fileName` | Download a file (streams, `Content-Disposition: attachment`) |
| `POST` | `/api/upload/init` | Start a chunked upload. Body: `{ fileName, fileSize, chunkSize, totalChunks }`. Returns `{ uploadId }` |
| `PUT` | `/api/upload/:uploadId/chunk/:index` | Upload one chunk. Header `X-Chunk-Hash: <sha256-hex>`, body is raw bytes |
| `GET` | `/api/upload/:uploadId/status` | Which chunks are received / missing |
| `POST` | `/api/upload/:uploadId/complete` | Assemble all chunks into `uploads/<fileName>` |
| `DELETE` | `/api/upload/:uploadId` | Abandon a chunked upload and delete its workspace |

## Project layout

```
.
├── public/                    # Browser UI (served statically)
│   ├── index.html
│   ├── styles.css
│   ├── js/
│   │   ├── api/               # One file per HTTP endpoint
│   │   ├── upload/            # Chunked upload orchestration
│   │   ├── ui/                # Button/status helpers
│   │   ├── utils/             # sha256Hex, bytesToHex, formatBytes
│   │   └── helpers/           # fileSelect and misc
│   └── vendor/
│       └── sha256.umd.min.js  # hash-wasm fallback for non-HTTPS origins
├── uploads/                   # Completed files (gitignored)
├── uploads-tmp/               # In-progress chunked uploads (gitignored)
├── utils/
│   ├── assembleChunks.js
│   └── getFileMetaData.js
├── server.js                  # Express app
├── package.json
├── .env.example
└── .gitignore
```

## How chunked upload works (short version)

1. Client calls `/api/upload/init` with file name, size, chunk size, total chunks.
2. Server creates a workspace under `uploads-tmp/<uploadId>/` and writes `meta.json`.
3. Client computes SHA-256 of each 4 MiB chunk and `PUT`s it to
   `/api/upload/:uploadId/chunk/:index` with the hash in `X-Chunk-Hash`.
4. Server streams the chunk to disk **while** hashing it, then compares.
   On mismatch, the chunk file is deleted and the client retries.
5. Client calls `/complete`. Server concatenates chunks in order into
   `assembledChunk.bin`, verifies the whole-file size, and `rename`s
   it atomically into `uploads/<fileName>`.
6. On success, the temp workspace is deleted.

Chunks are independent, so up to 6 upload in parallel. Because each chunk
carries its own hash, retries are safe and resume is trivial: `/status`
tells the client what is missing.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Phone cannot reach the server | Firewall, wrong IP, or different network | Check `ipconfig` / `ifconfig wlan0`; confirm same SSID; add firewall rule for TCP `PORT` |
| Uploads abort at ~5 minutes | Node's default `requestTimeout` | Already disabled in `server.js` via `server.requestTimeout = 0` |
| `crypto.subtle is undefined` on phone | Page is on plain HTTP (non-localhost) | Ensure `/vendor/sha256.umd.min.js` is loaded and `createSHA256Hex` falls back to `hashwasm` |
| `hashwasm is not defined` | UMD script missing or loaded after the module script | `<script src="/vendor/sha256.umd.min.js"></script>` must come **before** `<script type="module" src="/js/app.js"></script>` |
| Slow transfers | Wi-Fi link rate | Check `netsh wlan show interfaces`; move to 5 GHz; change channel; update adapter driver |
| `EADDRINUSE` | Port already in use | Change `PORT` in `.env`, or kill the existing Node process |

## License

MIT.