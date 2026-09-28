import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  FiCopy,
  FiEdit2,
  FiFlag,
  FiMoreHorizontal,
  FiPlus,
  FiSmile,
  FiTrash2,
} from "react-icons/fi";

const QUICK_REACTIONS = ["❤️", "👍", "😂", "😮", "😢", "🙏"];

// small toolbar next to a bubble. on desktop it shows on hover, on touch
// screens the bubble has to be tapped first (`visible`)
const MessageActions = ({
  isMe,
  visible,
  myReaction,
  canEdit,
  canCopy,
  onReact,
  onMoreReactions,
  onEdit,
  onCopy,
  onDelete,
  onReport,
}) => {
  const [open, setOpen] = useState(null);
  const [placeBelow, setPlaceBelow] = useState(false);
  const toolbarRef = useRef(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (toolbarRef.current?.contains(e.target) || popoverRef.current?.contains(e.target)) return;
      setOpen(null);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(null);
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // messages near the top of the list open their popover downwards
  // so it doesn't get cut off by the header
  const toggle = (name) => (e) => {
    e.stopPropagation();
    const top = toolbarRef.current?.getBoundingClientRect().top ?? 999;
    setPlaceBelow(top < 190);
    setOpen((current) => (current === name ? null : name));
  };

  const run = (fn) => (e) => {
    e.stopPropagation();
    setOpen(null);
    fn?.();
  };

  const popoverPosition = `${placeBelow ? "top-full mt-2" : "bottom-full mb-2"} ${
    isMe ? "right-0" : "left-0"
  }`;

  // the toolbar sits beside the bubble, popovers are anchored to the bubble
  // itself so they line up with its edge and stay on screen
  return (
    <>
      <div
        ref={toolbarRef}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        className={`absolute top-1/2 z-10 flex -translate-y-1/2 items-center gap-0.5 transition-opacity ${
          isMe ? "right-full mr-1.5 flex-row-reverse" : "left-full ml-1.5"
        } ${
          visible || open
            ? "opacity-100"
            : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
        }`}
      >
        <button onClick={toggle("react")} className="icon-btn p-1.5" aria-label="React">
          <FiSmile />
        </button>
        <button onClick={toggle("menu")} className="icon-btn p-1.5" aria-label="More actions">
          <FiMoreHorizontal />
        </button>
      </div>

      <div
        ref={popoverRef}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <AnimatePresence>
          {open === "react" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: placeBelow ? -6 : 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.12 }}
              className={`absolute z-30 ${popoverPosition} flex items-center gap-0.5 rounded-full border border-gray-100 bg-white p-1 shadow-lg`}
            >
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={run(() => onReact(emoji))}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-xl transition hover:scale-125 hover:bg-gray-100 ${
                    myReaction === emoji ? "bg-indigo-50" : ""
                  }`}
                >
                  {emoji}
                </button>
              ))}
              <button
                onClick={run(onMoreReactions)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
                aria-label="More reactions"
              >
                <FiPlus />
              </button>
            </motion.div>
          )}

          {open === "menu" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              className={`absolute z-30 ${popoverPosition} w-40 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg`}
            >
              {canCopy && <MenuItem icon={FiCopy} label="Copy" onClick={run(onCopy)} />}
              {isMe && canEdit && <MenuItem icon={FiEdit2} label="Edit" onClick={run(onEdit)} />}
              {isMe ? (
                <MenuItem icon={FiTrash2} label="Delete" danger onClick={run(onDelete)} />
              ) : (
                <MenuItem icon={FiFlag} label="Report" onClick={run(onReport)} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

const MenuItem = ({ icon: Icon, label, onClick, danger }) => (
  <button
    onClick={onClick}
    className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition-colors ${
      danger ? "text-red-600 hover:bg-red-50" : "text-gray-700 hover:bg-gray-50"
    }`}
  >
    <Icon className="text-[15px]" />
    {label}
  </button>
);

export default MessageActions;
