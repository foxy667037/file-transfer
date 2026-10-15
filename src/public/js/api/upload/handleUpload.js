import fetchFiles from "../fetchFiles.js";
import { uploadFile } from "./uploadFile.js";
import {
  setUploadButtonLoading,
  setUploadButtonIdle,
} from "../ui/uploadButton.js";
import { setUploadStatus } from "../ui/uploadStatus.js";

const handleUpload = async ({
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
}) => {
  const file = fileInput.files[0];
  if (!file) return;
  console.log(file);

  setUploadButtonLoading(uploadBtn);
  setUploadStatus(uploadStatus, `Uploading ${file.name}...`, "info");

  try {
    await uploadFile(file, ({ done, total }) => {
      if (total > 0) {
        setUploadStatus(
          uploadStatus,
          `Uploading ${file.name}: ${done}/${total} chunks`,
          "info",
        );
      }
    });

    setUploadStatus(uploadStatus, "File uploaded successfully!", "success");

    // Reset file input UI
    fileInput.value = "";
    selectedFileName.textContent = "Any file format supported";
    selectedFileName.className = "text-xs text-slate-400 mt-1";
    setUploadButtonIdle(uploadBtn, false);

    // Refresh file list
    await fetchFiles(
      tableBody,
      emptyState,
      errorState,
      refreshIcon,
      errorMessage,
      loadingState,
      fileCountBadge,
    );

    setTimeout(() => setUploadStatus(uploadStatus, ""), 4000);
  } catch (err) {
    console.error(err);
    setUploadStatus(
      uploadStatus,
      err.message || "Failed to upload file.",
      "error",
    );
    setUploadButtonIdle(uploadBtn, true);
  }
};

export default handleUpload;
