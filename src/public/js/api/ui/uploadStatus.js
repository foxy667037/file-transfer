const KIND_CLASSES = {
  info: "text-xs font-medium text-indigo-600",
  success: "text-xs font-semibold text-emerald-600",
  error: "text-xs font-semibold text-rose-600",
};

export function setUploadStatus(el, message, kind = "info") {
  el.textContent = message;
  el.className = KIND_CLASSES[kind] || KIND_CLASSES.info;
}
