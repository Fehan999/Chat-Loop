import { useEffect, useState } from "react";
import { FiBell, FiLock, FiSend } from "react-icons/fi";
import { APP_NAME } from "../../constants";
import FormField from "../auth/FormField";
import Toggle from "../common/Toggle";

// what people will see: the same card as AnnouncementPopup in the chat screen
const NotificationPreview = ({ title, text }) => (
  <div className="mx-auto w-full max-w-[380px] overflow-hidden rounded-2xl bg-white shadow-xl shadow-indigo-950/10 ring-1 ring-black/5">
    <div className="h-1 bg-gradient-to-r from-indigo-500 to-violet-600" />
    <div className="flex gap-3 p-4">
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
        <FiBell />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-indigo-500">
          {APP_NAME} <span className="normal-case tracking-normal text-gray-400">· just now</span>
        </p>
        <p className="mt-0.5 font-semibold text-gray-900">{title.trim() || "Announcement"}</p>
        <p className="mt-1 whitespace-pre-line break-words text-sm text-gray-600">{text}</p>
        <span className="mt-3 inline-block rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-600">
          Got it
        </span>
      </div>
    </div>
  </div>
);

// one announcement for everyone. it pops up once for each person, next time
// they open the app (or straight away if they're online)
const AnnouncementSection = ({ announcement, canEdit, onSave }) => {
  const [title, setTitle] = useState(announcement.title || "");
  const [text, setText] = useState(announcement.text || "");
  const [active, setActive] = useState(!!announcement.active);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(announcement.title || "");
    setText(announcement.text || "");
    setActive(!!announcement.active);
  }, [announcement.title, announcement.text, announcement.active]);

  const changed =
    title !== (announcement.title || "") ||
    text !== (announcement.text || "") ||
    active !== !!announcement.active;

  const save = async () => {
    setSaving(true);
    await onSave({ title, text, active });
    setSaving(false);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card space-y-4 p-5">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Send an announcement</h3>
          <p className="text-xs text-gray-500">
            Shows up as a notification for every user, once. People who are online get it right
            away, everyone else the next time they open ChatLoop.
          </p>
        </div>
        <label className="block text-xs font-medium text-gray-500">
          Title
          <FormField
            className="mt-1"
            value={title}
            maxLength={60}
            disabled={!canEdit}
            placeholder="New feature, maintenance, ..."
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="block text-xs font-medium text-gray-500">
          Message
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            maxLength={280}
            disabled={!canEdit}
            placeholder="We're doing a quick update tonight at 11pm..."
            className="input-field mt-1 resize-none"
          />
          <span className="mt-1 block text-right tabular-nums text-gray-400">
            {text.length}/280
          </span>
        </label>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-700">Live</p>
            <p className="text-xs text-gray-400">Turn off to stop showing it to new people</p>
          </div>
          <Toggle
            label="Announcement live"
            checked={active}
            disabled={!canEdit}
            onChange={setActive}
          />
        </div>
        <button
          onClick={save}
          disabled={canEdit && (!changed || saving || (active && !text.trim()))}
          className="btn-primary w-full"
        >
          {!canEdit ? (
            <>
              <FiLock /> Admin only
            </>
          ) : saving ? (
            "Sending..."
          ) : (
            <>
              <FiSend /> {active ? "Publish" : "Save"}
            </>
          )}
        </button>
        <p className="text-xs text-gray-400">
          Editing the title or message sends it again, as a new announcement.
        </p>
      </div>

      <div className="card flex flex-col p-5">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Preview</h3>
        {text.trim() ? (
          <div className="flex flex-1 items-start justify-center rounded-2xl bg-gradient-to-br from-indigo-50 via-gray-50 to-violet-50 p-4 sm:p-6">
            <NotificationPreview title={title} text={text.trim()} />
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-sm text-gray-400">
            Write a message to see how it looks.
          </p>
        )}
        {!active && announcement.text && (
          <p className="mt-3 text-center text-xs text-gray-400">
            Not live right now, nobody new will see it.
          </p>
        )}
      </div>
    </div>
  );
};

export default AnnouncementSection;
