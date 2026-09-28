import { FiUserX } from "react-icons/fi";

const EmptyState = ({ searchTerm }) => {
  const looksLikeId = /^\d+$/.test(searchTerm);

  return (
    <div className="py-12 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
        <FiUserX className="text-2xl text-gray-400" />
      </div>
      <h3 className="font-medium text-gray-900">No one found for &quot;{searchTerm}&quot;</h3>
      <p className="mx-auto mt-1 max-w-xs text-sm text-gray-400">
        {looksLikeId
          ? "IDs are exactly 4 digits, you'll find it on their profile."
          : "Check the spelling, or try their username or 4-digit ID instead."}
      </p>
    </div>
  );
};

export default EmptyState;
