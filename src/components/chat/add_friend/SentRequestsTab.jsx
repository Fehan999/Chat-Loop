import { FiSend } from "react-icons/fi";
import { formatRelativeTime } from "../../../utils/dateUtils";
import LoadingState from "./LoadingState";
import UserCard from "./UserCard";

const SentRequestsTab = ({ requests, loading, handlers }) => {
  if (loading) return <LoadingState />;

  if (requests.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
          <FiSend className="text-2xl text-amber-400" />
        </div>
        <h3 className="font-medium text-gray-900">Nothing waiting</h3>
        <p className="mt-1 text-sm text-gray-400">
          Requests you send will wait here until they answer.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="px-1 text-xs text-gray-400">{requests.length} waiting for a reply</p>
      {requests.map((request) => (
        <UserCard
          key={request.id}
          user={request}
          variant="sent"
          meta={request.createdAt ? `Sent ${formatRelativeTime(request.createdAt)}` : null}
          handlers={handlers}
        />
      ))}
    </div>
  );
};

export default SentRequestsTab;
