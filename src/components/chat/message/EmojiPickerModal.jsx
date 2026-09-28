import { lazy, Suspense } from "react";
import Modal from "../../common/Modal";

// the picker is heavy, only load it when someone actually opens it
const EmojiPicker = lazy(() => import("emoji-picker-react"));

const EmojiPickerModal = ({ onSelect, onClose }) => (
  <Modal title="Pick a reaction" onClose={onClose} maxWidth="max-w-sm" bodyClassName="p-0">
    <Suspense
      fallback={
        <div className="flex h-[380px] items-center justify-center">
          <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-indigo-500 border-t-transparent" />
        </div>
      }
    >
      <EmojiPicker
        width="100%"
        height={380}
        lazyLoadEmojis
        emojiStyle="native"
        skinTonesDisabled
        previewConfig={{ showPreview: false }}
        onEmojiClick={(emojiData) => {
          onSelect(emojiData.emoji);
          onClose();
        }}
      />
    </Suspense>
  </Modal>
);

export default EmojiPickerModal;
