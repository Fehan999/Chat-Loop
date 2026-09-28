import { AnimatePresence } from "framer-motion";
import { useState } from "react";
import { FiCheck, FiClock, FiMessageCircle, FiUserMinus, FiUserPlus, FiX } from "react-icons/fi";
import { resolvePresence } from "../../../utils/statusHelper";
import { avatarFor, formatUsername } from "../../../utils/userDisplay";
import ConfirmDialog from "../../common/ConfirmDialog";

// wraps the matching part of a name in a highlight
const highlight = (text, term) => {
  if (!term || !text) return text;
  const index = text.toLowerCase().indexOf(term.toLowerCase());
  if (index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-indigo-100 px-0.5 text-indigo-700">
        {text.slice(index, index + term.length)}
      </mark>
      {text.slice(index + term.length)}
    </>
  );
};

// one person in any of the friends tabs. `variant` decides which buttons show
const UserCard = ({ user, variant, relation = "none", searchTerm, meta, handlers }) => {
  const [busy, setBusy] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const userId = user.userId || user.id;
  const online = resolvePresence(user).status === "online";

  const act = (name, fn) => async () => {
    setBusy(name);
    await fn(userId);
    setBusy(null);
  };

  const spinner = (
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
  const primary = "btn-primary px-3.5 py-2";
  const secondary = "btn-secondary px-3.5 py-2";

  const renderActions = () => {
    if (variant === "received") {
      return (
        <>
          <button onClick={act("accept", handlers.accept)} disabled={!!busy} className={primary}>
            {busy === "accept" ? spinner : <FiCheck />} Accept
          </button>
          <button
            onClick={act("decline", handlers.decline)}
            disabled={!!busy}
            className={secondary}
          >
            {busy === "decline" ? spinner : <FiX />}
            <span className="hidden sm:inline">Decline</span>
          </button>
        </>
      );
    }
    if (variant === "sent") {
      return (
        <button onClick={act("cancel", handlers.cancel)} disabled={!!busy} className={secondary}>
          {busy === "cancel" ? spinner : <FiX />} Cancel
        </button>
      );
    }
    if (variant === "friend" || relation === "friend") {
      return (
        <>
          <button onClick={() => handlers.message(userId)} className={primary}>
            <FiMessageCircle /> <span className="hidden sm:inline">Message</span>
          </button>
          {variant === "friend" && (
            <button
              onClick={() => setConfirmRemove(true)}
              className="icon-btn hover:bg-red-50 hover:text-red-500"
              title="Remove friend"
            >
              <FiUserMinus />
            </button>
          )}
        </>
      );
    }
    if (relation === "sent") {
      return (
        <button disabled className={secondary}>
          <FiClock /> Requested
        </button>
      );
    }
    if (relation === "received") {
      return (
        <button onClick={act("accept", handlers.accept)} disabled={!!busy} className={primary}>
          {busy === "accept" ? spinner : <FiCheck />} Accept
        </button>
      );
    }
    return (
      <button onClick={act("send", handlers.send)} disabled={!!busy} className={primary}>
        {busy === "send" ? spinner : <FiUserPlus />} Add
      </button>
    );
  };

  return (
    <div className="card flex items-center gap-3 p-3 transition hover:border-indigo-100">
      <button onClick={() => handlers.viewProfile(userId)} className="relative flex-shrink-0">
        <img src={avatarFor(user)} alt="" className="h-12 w-12 rounded-full object-cover" />
        {online && (
          <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
        )}
      </button>

      <button onClick={() => handlers.viewProfile(userId)} className="min-w-0 flex-1 text-left">
        <p className="truncate font-semibold text-gray-900">
          {highlight(user.name || "User", searchTerm)}
        </p>
        <p className="truncate text-sm text-gray-500">
          {highlight(formatUsername(user.username), searchTerm)}
          {user.uniqueId && <span className="text-gray-300"> · ID {user.uniqueId}</span>}
        </p>
        {meta && <p className="mt-0.5 text-xs text-gray-400">{meta}</p>}
      </button>

      <div className="flex flex-shrink-0 items-center gap-2">{renderActions()}</div>

      <AnimatePresence>
        {confirmRemove && (
          <ConfirmDialog
            title={`Remove ${user.name}?`}
            message="You can still see your old messages, and you can add each other again later."
            confirmLabel="Remove"
            onConfirm={() => handlers.remove(userId)}
            onClose={() => setConfirmRemove(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserCard;
