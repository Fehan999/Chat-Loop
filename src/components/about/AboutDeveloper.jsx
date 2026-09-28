import { DEVELOPER } from "../../developer";
import DeveloperLinks from "./DeveloperLinks";

// the "who made this" card under the login form
const AboutDeveloper = ({ compact = false }) => (
  <section aria-labelledby="about-developer" className="card p-5 sm:p-6">
    <div className="flex items-center gap-3">
      <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white">
        ES
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-indigo-500">Built by</p>
        <h2 id="about-developer" className="text-lg font-bold text-gray-900">
          {DEVELOPER.name}
        </h2>
        <p className="text-sm text-gray-500">{DEVELOPER.role}</p>
      </div>
    </div>

    <div className="mt-4 space-y-2 text-sm leading-relaxed text-gray-600">
      {(compact ? DEVELOPER.bio.slice(0, 1) : DEVELOPER.bio).map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>

    {!compact && (
      <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Skills">
        {DEVELOPER.skills.map((skill) => (
          <li
            key={skill}
            className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600"
          >
            {skill}
          </li>
        ))}
      </ul>
    )}

    <DeveloperLinks className="mt-4" />
  </section>
);

export default AboutDeveloper;
