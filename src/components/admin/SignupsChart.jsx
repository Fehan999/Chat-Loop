import { useMemo, useState } from "react";
import { toDate } from "../../utils/dateUtils";

const DAYS = 14;

// rounds the top of the axis to a clean number so ticks read nicely
const niceMax = (value) => {
  if (value <= 4) return 4;
  const step = Math.pow(10, Math.floor(Math.log10(value)));
  const nice = [1, 2, 2.5, 5, 10].map((m) => m * step).find((n) => n >= value);
  return nice || value;
};

const dayKey = (date) => date.toISOString().slice(0, 10);

// new accounts per day for the last two weeks, single series so no legend
const SignupsChart = ({ users }) => {
  const [hovered, setHovered] = useState(null);

  const days = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const buckets = Array.from({ length: DAYS }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (DAYS - 1 - i));
      return { key: dayKey(date), date, count: 0 };
    });
    const byKey = new Map(buckets.map((b) => [b.key, b]));
    users.forEach((user) => {
      const created = toDate(user.createdAt);
      if (!created) return;
      const local = new Date(created);
      local.setHours(12, 0, 0, 0);
      const bucket = byKey.get(dayKey(local));
      if (bucket) bucket.count += 1;
    });
    return buckets;
  }, [users]);

  const total = days.reduce((sum, d) => sum + d.count, 0);
  const max = niceMax(Math.max(...days.map((d) => d.count), 1));
  const ticks = [max, max / 2, 0];
  const label = (date) => date.toLocaleDateString([], { month: "short", day: "numeric" });

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">New sign-ups</h3>
          <p className="text-xs text-gray-500">Last 14 days</p>
        </div>
        <p className="text-2xl font-semibold text-gray-900">{total.toLocaleString()}</p>
      </div>

      <div className="flex gap-2">
        <div className="flex h-40 flex-col justify-between py-0 text-right text-[11px] tabular-nums text-gray-400">
          {ticks.map((tick) => (
            <span key={tick} className="-translate-y-1/2 leading-none last:translate-y-1/2">
              {Number.isInteger(tick) ? tick : tick.toFixed(1)}
            </span>
          ))}
        </div>

        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40">
            {ticks.map((tick, i) => (
              <div
                key={tick}
                className="absolute inset-x-0 border-t border-gray-100"
                style={{ top: `${(i / (ticks.length - 1)) * 100}%` }}
              />
            ))}
          </div>

          <div className="relative flex h-40 items-end">
            {days.map((day, i) => (
              <button
                key={day.key}
                type="button"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
                aria-label={`${label(day.date)}: ${day.count} sign-ups`}
                className="group relative flex h-full flex-1 items-end justify-center px-[1px] outline-none"
              >
                <span
                  className={`block w-full max-w-[24px] rounded-t transition-colors ${
                    hovered === i ? "bg-indigo-400" : "bg-indigo-500"
                  }`}
                  style={{ height: `${(day.count / max) * 100}%`, minHeight: day.count ? 3 : 0 }}
                />
                {hovered === i && (
                  <span className="absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-left shadow-lg">
                    <span className="block text-sm font-semibold text-white">{day.count}</span>
                    <span className="block text-[11px] text-gray-300">{label(day.date)}</span>
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="mt-2 flex text-[11px] text-gray-400">
            {days.map((day, i) => (
              <span key={day.key} className="flex-1 whitespace-nowrap text-center">
                {(days.length - 1 - i) % 3 === 0 ? label(day.date) : ""}
              </span>
            ))}
          </div>
        </div>
      </div>

      <table className="sr-only">
        <caption>New sign-ups per day, last 14 days</caption>
        <tbody>
          {days.map((day) => (
            <tr key={day.key}>
              <th scope="row">{label(day.date)}</th>
              <td>{day.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SignupsChart;
