const getFileIcon = (filename) => {
  const ext = filename.split(".").pop().toLowerCase();
  switch (ext) {
    case "pdf":
      return { icon: "fa-file-pdf text-rose-500", bg: "bg-rose-50" };

    case "zip":
    case "rar":
    case "tar":
    case "gz":
      return { icon: "fa-file-zipper text-amber-500", bg: "bg-amber-50" };

    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "svg":
      return {
        icon: "fa-file-image text-emerald-500",
        bg: "bg-emerald-50",
      };

    case "mp4":
    case "mov":
    case "avi":
      return {
        icon: "fa-file-video text-violet-500",
        bg: "bg-violet-50",
      };

    case "mp3":
    case "wav":
      return { icon: "fa-file-audio text-sky-500", bg: "bg-sky-50" };

    case "js":
    case "ts":
    case "html":
    case "css":
    case "json":
      return { icon: "fa-file-code text-indigo-500", bg: "bg-indigo-50" };

    case "txt":
    case "md":
      return { icon: "fa-file-lines text-slate-500", bg: "bg-slate-100" };

    case "iso":
    case "img":
    case "bin":
    case "cue":
      return {
        icon: "fa-compact-disc",
        bg: "bg-purple-50 text-purple-600 border border-purple-200",
      };

    default:
      return { icon: "fa-file text-blue-500", bg: "bg-blue-50" };
  }
};

export default getFileIcon;