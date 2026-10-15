import formatBytes from "./formatBytes.js";

function fileSelect(input, selectedFileName, uploadBtn) {
  if (input.files && input.files[0]) {
    const file = input.files[0];
    selectedFileName.textContent = `Selected: ${file.name} (${formatBytes(file.size)})`;
    selectedFileName.className = "text-xs font-semibold text-indigo-600 mt-1";
    uploadBtn.disabled = false;
    uploadBtn.className =
      "inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer";
  }
}

export default fileSelect;
