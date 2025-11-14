import React, { useEffect } from "react";

interface Props {
  src: string | null;
  alt?: string;
  onClose: () => void;
}

const ImageModal: React.FC<Props> = ({ src, alt = "", onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!src) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70"
    >
      <div
        className="max-w-[95%] max-h-[95%] p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          className="w-auto h-auto max-w-full max-h-[80vh] rounded-md shadow-2xl object-contain"
        />
        <div className="mt-2 text-right">
          <button
            onClick={onClose}
            className="px-3 py-1 bg-white/10 text-white rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageModal;

