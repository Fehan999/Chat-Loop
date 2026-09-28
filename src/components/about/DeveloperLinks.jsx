import { FaGithub, FaLinkedin } from "react-icons/fa";
import { FiGlobe } from "react-icons/fi";
import { DEVELOPER } from "../../developer";

const LINKS = [
  { label: DEVELOPER.websiteLabel, href: DEVELOPER.website, Icon: FiGlobe },
  { label: "LinkedIn", href: DEVELOPER.linkedin, Icon: FaLinkedin },
  { label: "GitHub", href: DEVELOPER.github, Icon: FaGithub },
];

// website / linkedin / github pills, light version sits on the indigo panel
const DeveloperLinks = ({ light = false, className = "" }) => (
  <div className={`flex flex-wrap gap-2 ${className}`}>
    {LINKS.map(({ label, href, Icon }) => (
      <a
        key={href}
        href={href}
        target="_blank"
        rel="noopener noreferrer me"
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
          light
            ? "bg-white/15 text-white hover:bg-white/25"
            : "border border-gray-200 bg-white text-gray-700 hover:border-indigo-200 hover:text-indigo-600"
        }`}
      >
        <Icon className="text-sm" />
        {label}
      </a>
    ))}
  </div>
);

export default DeveloperLinks;
