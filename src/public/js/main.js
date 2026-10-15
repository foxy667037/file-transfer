import fetchFiles from "./api/fetchFiles.js";
import downloadFile from "./api/downloadFile.js";
import fileSelect from "./helpers/fileSelect.js";
import handleUpload from "./api/upload/handleUpload.js";

const tableBody = document.getElementById("table-body");
const emptyState = document.getElementById("empty-state");
const errorState = document.getElementById("error-state");
const refreshIcon = document.getElementById("refresh-icon");
const errorMessage = document.getElementById("error-message");
const loadingState = document.getElementById("loading-state");
const fileCountBadge = document.getElementById("file-count-badge");

const fileInput = document.getElementById("file-input");
const uploadBtn = document.getElementById("upload-btn");
const refreshBtn = document.getElementById("refresh-btn");
const uploadStatus = document.getElementById("upload-status");
const selectedFileName = document.getElementById("selected-file-name");

(() =>
  fetchFiles(
    tableBody,
    emptyState,
    errorState,
    refreshIcon,
    errorMessage,
    loadingState,
    fileCountBadge,
  ))();

tableBody.addEventListener("click", (event) => {
  const button = event.target.closest('button[data-action="download"]');
  if (!button || !tableBody.contains(button)) return;

  const fileName = button.getAttribute("data-file-name");
  downloadFile(fileName);
});

uploadBtn.addEventListener("click", () =>
  handleUpload({
    selectedFileName,
    uploadStatus,
    fileInput,
    uploadBtn,
    tableBody,
    emptyState,
    errorState,
    refreshIcon,
    errorMessage,
    loadingState,
    fileCountBadge,
  }),
);

fileInput.addEventListener("change", (input) =>
  fileSelect(input.target, selectedFileName, uploadBtn),
);

refreshBtn.addEventListener("click", () =>
  fetchFiles(
    tableBody,
    emptyState,
    errorState,
    refreshIcon,
    errorMessage,
    loadingState,
    fileCountBadge,
  ),
);
