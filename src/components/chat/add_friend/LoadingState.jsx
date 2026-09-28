const LoadingState = ({ rows = 3 }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="card flex items-center gap-3 p-3">
        <div className="h-12 w-12 animate-pulse rounded-full bg-gray-100" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-32 animate-pulse rounded bg-gray-100" />
          <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="h-9 w-20 animate-pulse rounded-xl bg-gray-100" />
      </div>
    ))}
  </div>
);

export default LoadingState;
