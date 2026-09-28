import { FiFlag } from "react-icons/fi";
import Modal from "../../common/Modal";
import ReportForm from "./ReportForm";

const ReportMessageModal = ({ onSubmit, onClose }) => (
  <Modal title="Report message" icon={<FiFlag className="text-red-500" />} onClose={onClose}>
    <ReportForm
      onClose={onClose}
      onSubmit={({ reason, details }) => onSubmit(details ? `${reason} - ${details}` : reason)}
    />
  </Modal>
);

export default ReportMessageModal;
