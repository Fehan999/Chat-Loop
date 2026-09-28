import { HiSparkles } from "react-icons/hi2";

const AIAvatar = ({ size = 40 }) => (
  <span
    className="flex flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm shadow-indigo-500/30"
    style={{ width: size, height: size }}
  >
    <HiSparkles style={{ width: size * 0.45, height: size * 0.45 }} />
  </span>
);

export default AIAvatar;
