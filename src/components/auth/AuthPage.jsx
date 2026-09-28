import { motion } from "framer-motion";
import { FiCheck, FiMic, FiPhone } from "react-icons/fi";
import { DEVELOPER } from "../../developer";
import { usePageTitle } from "../../hooks/usePageTitle";
import AboutDeveloper from "../about/AboutDeveloper";
import DeveloperLinks from "../about/DeveloperLinks";
import Logo from "../brand/Logo";
import AuthCard from "./AuthCard";

const Credit = () => (
  <div className="relative space-y-3">
    <p className="text-sm text-indigo-100">
      Designed & developed by{" "}
      <a
        href={DEVELOPER.website}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-white hover:underline"
      >
        {DEVELOPER.name}
      </a>
    </p>
    <DeveloperLinks light />
  </div>
);

// a small static copy of the chat screen so the login page feels like the app
const ChatPreview = () => (
  <div className="w-full max-w-sm rounded-2xl bg-white/95 p-4 text-gray-900 shadow-2xl shadow-indigo-950/30">
    <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
      <div className="relative">
        <img
          src="https://ui-avatars.com/api/?name=Sara+Khan&background=f472b6&color=fff&bold=true"
          alt=""
          className="h-9 w-9 rounded-full"
        />
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold">Sara Khan</p>
        <p className="text-xs text-emerald-600">Active now</p>
      </div>
      <FiPhone className="text-gray-400" />
    </div>

    <div className="space-y-2.5 pt-3 text-sm">
      <div className="w-fit max-w-[80%] rounded-2xl rounded-bl-md bg-gray-100 px-3.5 py-2">
        are we still on for tonight?
      </div>
      <div className="relative ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-md bg-indigo-500 px-3.5 py-2 text-white">
        yes! leaving in 10 min
        <span className="absolute -bottom-2.5 left-2 rounded-full border border-gray-100 bg-white px-1.5 text-xs shadow-sm">
          ❤️
        </span>
      </div>
      <div className="flex w-fit items-center gap-2 rounded-2xl rounded-bl-md bg-gray-100 px-3 py-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-white">
          <FiMic size={12} />
        </span>
        <span className="flex h-4 items-end gap-0.5">
          {[6, 10, 14, 8, 12, 16, 9, 5, 11, 7].map((h, i) => (
            <span key={i} className="w-0.5 rounded-full bg-indigo-400" style={{ height: h }} />
          ))}
        </span>
        <span className="text-xs text-gray-500">0:08</span>
      </div>
    </div>
  </div>
);

const AuthPage = () => {
  usePageTitle(null);

  return (
    <div className="flex min-h-[100dvh] bg-gray-50">
      <aside className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-violet-400/20 blur-3xl" />

        <Logo size={44} withText tone="glass" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative space-y-8"
        >
          <div>
            <h1 className="text-4xl font-bold leading-tight xl:text-5xl">
              Stay in the loop
              <br />
              with your people.
            </h1>
            <p className="mt-4 max-w-md text-indigo-100">
              Messages, voice notes and calls in one place, plus an AI helper for when you need a
              quick answer.
            </p>
          </div>

          <ul className="space-y-2 text-sm text-indigo-50">
            {[
              "Real-time chat with read receipts",
              "Voice notes, photos and files",
              "Audio and video calls",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                  <FiCheck size={12} />
                </span>
                {item}
              </li>
            ))}
          </ul>

          <ChatPreview />
        </motion.div>

        <Credit />
      </aside>

      <main className="flex min-w-0 flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo size={44} withText />
          </div>
          <AuthCard />
          <div className="mt-4">
            <AboutDeveloper />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AuthPage;
