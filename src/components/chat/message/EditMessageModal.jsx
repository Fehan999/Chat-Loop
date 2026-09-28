import { useState } from "react";
import { FiCheck, FiEdit2 } from "react-icons/fi";
import Modal from "../../common/Modal";

const EditMessageModal = ({ message, onSave, onClose }) => {
  const [text, setText] = useState(message.text || "");
  const [saving, setSaving] = useState(false);
  const unchanged = text.trim() === (message.text || "").trim();

  const save = async () => {
    if (!text.trim() || unchanged) {
      onClose();
      return;
    }
    setSaving(true);
    await onSave(text);
    setSaving(false);
    onClose();
  };

  return (
    <Modal title="Edit message" icon={<FiEdit2 className="text-indigo-500" />} onClose={onClose}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            save();
          }
        }}
        rows={4}
        autoFocus
        className="input-field resize-none"
      />
      <p className="mt-2 text-xs text-gray-400">Enter to save, Shift + Enter for a new line</p>
      <div className="mt-5 flex gap-3">
        <button onClick={onClose} className="btn-secondary flex-1 py-2.5">
          Cancel
        </button>
        <button
          onClick={save}
          disabled={!text.trim() || saving}
          className="btn-primary flex-1 py-2.5"
        >
          {saving ? (
            "Saving..."
          ) : (
            <>
              <FiCheck /> Save
            </>
          )}
        </button>
      </div>
    </Modal>
  );
};

export default EditMessageModal;
