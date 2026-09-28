import { AnimatePresence } from "framer-motion";
import { FiFlag } from "react-icons/fi";
import Modal from "../common/Modal";
import ReportForm from "./message/ReportForm";

const USER_REASONS = [
  "Spam or scam",
  "Harassment or bullying",
  "Fake account",
  "Inappropriate behaviour",
  "Sharing personal information",
  "Other",
];

const ReportUserModal = ({ isOpen, onClose, user, onSubmit }) => (
  <AnimatePresence>
    {isOpen && user && (
      <Modal title="Report user" icon={<FiFlag className="text-red-500" />} onClose={onClose}>
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-gray-50 p-3">
          <img src={user.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-900">{user.name}</p>
            <p className="truncate text-xs text-gray-500">{user.username}</p>
          </div>
        </div>
        <ReportForm reasons={USER_REASONS} onClose={onClose} onSubmit={onSubmit} />
      </Modal>
    )}
  </AnimatePresence>
);

export default ReportUserModal;
