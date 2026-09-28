import { FiLogOut, FiSlash } from "react-icons/fi";
import { logout } from "../../service/userStatus";
import Logo from "../brand/Logo";

const BannedScreen = ({ reason }) => (
  <div className="flex h-[100dvh] items-center justify-center bg-gray-50 p-6">
    <div className="card w-full max-w-md p-8 text-center">
      <div className="mb-6 flex justify-center">
        <Logo size={44} withText />
      </div>
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
        <FiSlash className="text-2xl text-red-500" />
      </div>
      <h1 className="text-xl font-bold text-gray-900">Your account is suspended</h1>
      <p className="mt-2 text-sm text-gray-500">
        {reason || "This account broke the community rules."} If you think this is a mistake, get in
        touch with the ChatLoop team.
      </p>
      <button onClick={logout} className="btn-secondary mt-6 w-full">
        <FiLogOut /> Log out
      </button>
    </div>
  </div>
);

export default BannedScreen;
