import { useEffect, useState } from "react";
import { FiInfo, FiLock } from "react-icons/fi";
import Toggle from "../common/Toggle";

// one banner for everyone, shown at the top of the chat screen
const AnnouncementSection = ({ announcement, canEdit, onSave }) => {
  const [text, setText] = useState(announcement.text || "");
  const [active, setActive] = useState(!!announcement.active);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setText(announcement.text || "");
    setActive(!!announcement.active);
  }, [announcement.text, announcement.active]);

  const changed = text !== (announcement.text || "") || active !== !!announcement.active;

  const save = async () => {
    setSaving(true);
    await onSave({ text, active });
    setSaving(false);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card space-y-4 p-5">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Announcement banner</h3>
          <p className="text-xs text-gray-500">
            Maintenance notes, new features, that kind of thing. Keep it to one line.
          </p>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={180}
          disabled={!canEdit}
          placeholder="We're doing a quick update tonight at 11pm..."
          className="input-field resize-none"
        />
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">Show to everyone</span>
          <Toggle
            label="Show announcement"
            checked={active}
            disabled={!canEdit}
            onChange={setActive}
          />
        </div>
        <button
          onClick={save}
          disabled={canEdit && (!changed || saving)}
          className="btn-primary w-full"
        >
          {!canEdit ? (
            <>
              <FiLock /> Admin only
            </>
          ) : saving ? (
            "Saving..."
          ) : (
            "Publish"
          )}
        </button>
      </div>

      <div className="card p-5">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Preview</h3>
        {active && text.trim() ? (
          <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2.5 text-sm text-white">
            <FiInfo className="flex-shrink-0" />
            <p>{text}</p>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-sm text-gray-400">
            No banner is showing right now.
          </p>
        )}
      </div>
    </div>
  );
};

export default AnnouncementSection;
