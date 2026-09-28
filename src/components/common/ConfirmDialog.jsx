import { useState } from "react";
import Modal from "./Modal";

// yes/no dialog for anything destructive
const ConfirmDialog = ({
  title,
  message,
  confirmLabel = "Delete",
  tone = "danger",
  onConfirm,
  onClose,
}) => {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
      onClose();
    }
  };

  return (
    <Modal onClose={busy ? undefined : onClose} maxWidth="max-w-sm">
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {message && <p className="mt-2 text-sm text-gray-500">{message}</p>}
      <div className="mt-6 flex gap-3">
        <button onClick={onClose} disabled={busy} className="btn-secondary flex-1 py-2.5">
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={busy}
          className={`${tone === "danger" ? "btn-danger" : "btn-primary"} flex-1 py-2.5`}
        >
          {busy ? "Working..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
