const IDLE_CLASSES =
  "inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer";

const DISABLED_CLASSES =
  "inline-flex items-center space-x-2 bg-slate-300 text-slate-500 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-not-allowed";

export function setUploadButtonLoading(btn) {
  btn.disabled = true;
  btn.className = DISABLED_CLASSES;
  btn.innerHTML =
    '<i class="fa-solid fa-rotate animate-spin-custom"></i><span>Uploading...</span>';
}

export function setUploadButtonIdle(btn, enabled = true) {
  btn.disabled = !enabled;
  btn.className = enabled ? IDLE_CLASSES : DISABLED_CLASSES;
  btn.innerHTML = '<i class="fa-solid fa-upload"></i><span>Upload File</span>';
}
