import { motion } from "framer-motion";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";

// shared modal shell: backdrop, escape to close, click outside to close.
// wrap usages in <AnimatePresence> for the exit animation
const Modal = ({
  title,
  icon,
  onClose,
  children,
  maxWidth = "max-w-md",
  bodyClassName = "p-5",
}) => {
  useEffect(() => {
    const onKeyDown = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
      className="fixed inset-0 z-[80] flex items-end justify-center bg-gray-900/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ type: "spring", damping: 30, stiffness: 400 }}
        className={`w-full ${maxWidth} max-h-[90dvh] overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl`}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
              {icon}
              {title}
            </h3>
            <button onClick={onClose} className="icon-btn -mr-2" aria-label="Close">
              <FiX />
            </button>
          </div>
        )}
        <div className={`thin-scroll max-h-[calc(90dvh-64px)] overflow-y-auto ${bodyClassName}`}>
          {children}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
};

export default Modal;
