import formatBytes from "../helpers/formatBytes.js";
import getFileIcon from "../helpers/getFileIcon.js";

const fetchFiles = async (
  tableBody,
  emptyState,
  errorState,
  refreshIcon,
  errorMessage,
  loadingState,
  fileCountBadge,
) => {
  // Reset states & show loading indicator
  tableBody.innerHTML = "";
  loadingState.classList.remove("hidden");
  emptyState.classList.add("hidden");
  errorState.classList.add("hidden");
  refreshIcon.classList.add("animate-spin-custom");

  try {
    const res = await fetch("/api/files");
    if (!res.ok) throw new Error(`Server returned status ${res.status}`);

    const data = await res.json();
    const files_list = data.list_of_files || [];

    loadingState.classList.add("hidden");
    fileCountBadge.textContent = `${files_list.length} file${files_list.length === 1 ? "" : "s"}`;

    if (!files_list || files_list.length === 0) {
      emptyState.classList.remove("hidden");
      return;
    }

    // Render each file row
    files_list.forEach((file) => {
      const fileName = file.file_name || "Unnamed file";
      const fileSizeFormatted = formatBytes(file.file_size);
      const fileExt = fileName.includes(".")
        ? fileName.split(".").pop().toUpperCase() + " File"
        : "File";
      const iconInfo = getFileIcon(fileName);

      const row = document.createElement("tr");
      row.className =
        "cursor-pointer border-b border-gray-200 transition-colors duration-150 group hover:bg-gray-50";

      row.innerHTML = `
              <td class="py-4 px-6">
                <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 rounded-xl ${iconInfo.bg} flex items-center justify-center flex-shrink-0 shadow-sm">
                    <i class="fa-solid ${iconInfo.icon}"></i>
                  </div>
                  <div class="file-name font-semibold text-indigo-600 transition-colors truncate max-w-xs sm:max-w-sm md:max-w-md">
                    ${fileName}
                  </div>
                </div>
              </td>
              <td class="py-4 px-6">
                <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium text-indigo-600 border border-dashed border-indigo-600">
                  ${fileExt}
                </span>
              </td>
              <td class="py-4 px-6 font-mono text-xs font-semibold text-black/60">
                ${fileSizeFormatted}
              </td>
              <td class="py-4 px-6 text-right">
                <div class="flex items-center justify-end space-x-2">
                  <button data-file-name="${fileName}" data-action="download" title="Download File" class="p-2 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer">
                    <i class="fa-solid fa-download"></i>
                  </button>
                  <button title="Copy Filename" class="p-2 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer">
                    <i class="fa-solid fa-copy"></i>
                  </button>
                </div>
              </td>
            `;

      tableBody.appendChild(row);
    });
  } catch (err) {
    loadingState.classList.add("hidden");
    errorState.classList.remove("hidden");

    errorMessage.textContent =
      err.message || "Failed to retrieve files from server.";

    fileCountBadge.textContent = "0 files";
  } finally {
    setTimeout(() => {
      refreshIcon.classList.remove("animate-spin-custom");
    }, 300);
  }
};

export default fetchFiles;
