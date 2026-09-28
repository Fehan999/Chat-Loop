import { useState } from "react";
import { FiFlag } from "react-icons/fi";

const DEFAULT_REASONS = [
  "Spam or misleading",
  "Harassment or bullying",
  "Hate speech",
  "Inappropriate content",
  "Violence or threats",
  "Scam or fraud",
  "Other",
];

// shared by message and user reports, the parent decides what gets saved
const ReportForm = ({ reasons = DEFAULT_REASONS, onSubmit, onClose }) => {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) return;
    setSending(true);
    await onSubmit({ reason, details: details.trim() });
    setSending(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {reasons.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setReason(item)}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              reason === item
                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder="Anything else we should know? (optional)"
        rows={3}
        maxLength={500}
        className="input-field resize-none"
      />
      <div className="flex gap-3">
        <button type="button" onClick={onClose} className="btn-secondary flex-1 py-2.5">
          Cancel
        </button>
        <button type="submit" disabled={!reason || sending} className="btn-danger flex-1 py-2.5">
          <FiFlag /> {sending ? "Sending..." : "Report"}
        </button>
      </div>
    </form>
  );
};

export default ReportForm;
