import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FiChevronLeft, FiChevronRight, FiDownload, FiX } from "react-icons/fi";

const ImageGalleryModal = ({ images, initialIndex = 0, onClose }) => {
  const [index, setIndex] = useState(initialIndex);
  const [loaded, setLoaded] = useState(false);
  const count = images.length;

  const go = useCallback(
    (step) => {
      setLoaded(false);
      setIndex((current) => (current + step + count) % count);
    },
    [count]
  );

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [go, onClose]);

  const current = images[index];

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90"
    >
      <div className="absolute right-4 top-4 z-10 flex gap-2">
        <a
          href={current.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          aria-label="Open original"
        >
          <FiDownload />
        </a>
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          aria-label="Close"
        >
          <FiX className="text-xl" />
        </button>
      </div>

      {count > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            className="absolute left-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Previous"
          >
            <FiChevronLeft className="text-2xl" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            className="absolute right-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Next"
          >
            <FiChevronRight className="text-2xl" />
          </button>
          <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
            {index + 1} / {count}
          </span>
        </>
      )}

      {!loaded && (
        <span className="absolute h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
      )}
      <img
        key={current.url}
        src={current.url}
        alt=""
        onClick={(e) => e.stopPropagation()}
        onLoad={() => setLoaded(true)}
        className={`max-h-[88vh] max-w-[92vw] object-contain transition-opacity ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </motion.div>,
    document.body
  );
};

export default ImageGalleryModal;
