import { FiInbox } from "react-icons/fi";
import { formatRelativeTime } from "../../../utils/dateUtils";
import UserCard from "./UserCard";

const ReceivedRequestsTab = ({ requests, handlers }) => {
  if (requests.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
          <FiInbox className="text-2xl text-emerald-400" />
        </div>
        <h3 className="font-medium text-gray-900">No pending requests</h3>
        <p className="mt-1 text-sm text-gray-400">
          When someone adds you, it&apos;ll show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="px-1 text-xs text-gray-400">
        {requests.length} pending request{requests.length === 1 ? "" : "s"}
      </p>
      {requests.map((request) => (
        <UserCard
          key={request.id}
          user={request}
          variant="received"
          meta={request.createdAt ? `Sent ${formatRelativeTime(request.createdAt)}` : null}
          handlers={handlers}
        />
      ))}
    </div>
  );
};

export default ReceivedRequestsTab;
