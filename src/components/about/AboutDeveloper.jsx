import { FaGithub, FaLinkedin } from "react-icons/fa";
import { FiGlobe } from "react-icons/fi";
import { DEVELOPER } from "../../developer";

const LINKS = [
  { label: "Website", href: DEVELOPER.website, Icon: FiGlobe },
  { label: "LinkedIn", href: DEVELOPER.linkedin, Icon: FaLinkedin },
  { label: "GitHub", href: DEVELOPER.github, Icon: FaGithub },
];

// small "built by" strip under the login form
const AboutDeveloper = () => (
  <section
    aria-label={`About the developer, ${DEVELOPER.name}`}
    className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm"
  >
    <span className="flex h-10 w-10 flex-shrink-0 items-center max-[359px]:hidden justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
      ES
    </span>
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-medium uppercase tracking-wider text-indigo-500">Built by</p>
      <a
        href={DEVELOPER.website}
        target="_blank"
        rel="noopener noreferrer author"
        className="block truncate text-sm font-semibold text-gray-900 hover:text-indigo-600"
        title={DEVELOPER.role}
      >
        {DEVELOPER.name}
      </a>
    </div>
    <div className="flex flex-shrink-0 items-center">
      {LINKS.map(({ label, href, Icon }) => (
        <a
          key={href}
          href={href}
          target="_blank"
          rel="noopener noreferrer me"
          aria-label={`${DEVELOPER.name} on ${label}`}
          title={label}
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-indigo-50 hover:text-indigo-600"
        >
          <Icon className="text-[17px]" />
        </a>
      ))}
    </div>
  </section>
);

export default AboutDeveloper;
