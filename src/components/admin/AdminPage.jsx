import { sendEmailVerification } from "firebase/auth";
import { useState } from "react";
import toast from "react-hot-toast";
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiBell,
  FiEye,
  FiFlag,
  FiGrid,
  FiLock,
  FiLogOut,
  FiRefreshCw,
  FiShield,
  FiUsers,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import {
  isGuestAccount,
  isOwnerAccount,
  ownerNeedsVerification,
  removeReportedMessage,
  saveAnnouncement,
  setUserBanned,
  updateReportStatus,
  updateUserAsAdmin,
} from "../../firebase/adminService";
import { auth } from "../../firebase/config";
import { useAdminData } from "../../hooks/useAdminData";
import { usePageTitle } from "../../hooks/usePageTitle";
import { logout } from "../../service/userStatus";
import Logo from "../brand/Logo";
import SplashScreen from "../common/SplashScreen";
import AdminLogin from "./AdminLogin";
import AnnouncementSection from "./AnnouncementSection";
import OverviewSection from "./OverviewSection";
import ReportsSection from "./ReportsSection";
import UsersSection from "./UsersSection";

const SECTIONS = [
  { id: "overview", label: "Overview", icon: FiGrid },
  { id: "users", label: "Users", icon: FiUsers },
  { id: "reports", label: "Reports", icon: FiFlag },
  { id: "announcement", label: "Announcement", icon: FiBell },
];

const GUEST_NOTICE = "You're logged in as guest, you can't edit or take action.";

// signed in, but with an account that can't open the dashboard
const NoAccess = ({ user, onVerify, onRecheck }) => {
  const needsVerification = ownerNeedsVerification(user);
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gray-50 px-4">
      <div className="card w-full max-w-md p-6 text-center sm:p-8">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-xl text-amber-600">
          {needsVerification ? <FiAlertTriangle /> : <FiLock />}
        </span>
        <h1 className="mt-4 text-xl font-bold text-gray-900">
          {needsVerification ? "Verify your email first" : "No admin access"}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          {needsVerification ? (
            <>
              You&apos;re signed in with an admin email, but it isn&apos;t verified yet. Verify it
              to unlock the dashboard.
            </>
          ) : (
            <>
              <span className="font-medium text-gray-700">{user.email}</span> isn&apos;t an admin
              account. Sign out and use an admin account or the guest login.
            </>
          )}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          {needsVerification && (
            <div className="flex gap-2">
              <button onClick={onVerify} className="btn-secondary flex-1 py-2.5">
                Send email
              </button>
              <button onClick={onRecheck} className="btn-primary flex-1 py-2.5">
                I&apos;ve verified
              </button>
            </div>
          )}
          <button onClick={logout} className="btn-secondary py-2.5">
            <FiLogOut /> Sign out and switch account
          </button>
          <Link to="/" className="py-2 text-sm text-gray-500 hover:text-gray-700">
            Back to chats
          </Link>
        </div>
      </div>
    </div>
  );
};

// /admin shows a login screen first. admin emails get full access, the guest
// login sees the same live data but every action is blocked
const AdminPage = ({ user }) => {
  const [section, setSection] = useState("overview");
  const [, forceRender] = useState(0);
  const isOwner = isOwnerAccount(auth.currentUser || user);
  const isGuest = isGuestAccount(user);
  const data = useAdminData({ enabled: isOwner || isGuest, withCounts: isOwner });
  usePageTitle(user ? "Admin panel" : "Admin login");

  const pendingReports = data.reports.filter((r) => (r.status || "pending") === "pending").length;

  // wraps every write. for the guest it just explains why nothing happened
  const guarded =
    (fn, successMessage) =>
    async (...args) => {
      if (!isOwner) {
        toast(GUEST_NOTICE, { icon: "🔒" });
        return false;
      }
      try {
        await fn(...args);
        if (successMessage) toast.success(successMessage);
        return true;
      } catch (error) {
        console.error(error);
        toast.error("That didn't save. Check the Firestore rules are deployed.");
        return false;
      }
    };

  const saveUser = guarded(async (target, form) => {
    await updateUserAsAdmin(target.id, {
      name: form.name.trim(),
      bio: form.bio.trim(),
      location: form.location.trim(),
    });
    if (form.banned !== !!target.banned || (form.banned && form.banReason !== target.banReason)) {
      await setUserBanned(target.id, form.banned, form.banReason.trim());
    }
  }, "User updated");

  const reportActions = {
    setStatus: guarded((report, status) => updateReportStatus(report.id, status), "Report updated"),
    removeMessage: guarded(async (report) => {
      await removeReportedMessage(report.chatId, report.messageId);
      await updateReportStatus(report.id, "resolved");
    }, "Message removed"),
    banUser: guarded((target, reason) => setUserBanned(target.id, true, reason), "User suspended"),
  };

  const publishAnnouncement = guarded(saveAnnouncement, "Announcement saved");

  const sendVerification = async () => {
    try {
      await sendEmailVerification(auth.currentUser);
      toast.success("Verification email sent");
    } catch {
      toast.error("Couldn't send the email, try again in a minute.");
    }
  };

  // after clicking the link in the email the token still says unverified until refreshed
  const recheckVerification = async () => {
    await auth.currentUser?.reload();
    await auth.currentUser?.getIdToken(true);
    forceRender((n) => n + 1);
    if (auth.currentUser?.emailVerified) toast.success("Verified, admin access unlocked");
    else toast("Still not verified, check your inbox.");
  };

  if (!user) return <AdminLogin />;
  if (!isOwner && !isGuest) {
    return (
      <NoAccess
        user={auth.currentUser || user}
        onVerify={sendVerification}
        onRecheck={recheckVerification}
      />
    );
  }
  if (data.loading) return <SplashScreen label="Loading admin data..." />;

  return (
    <div className="flex min-h-[100dvh] bg-gray-50">
      <aside className="sticky top-0 hidden h-[100dvh] w-60 flex-shrink-0 flex-col border-r border-gray-100 bg-white p-4 lg:flex">
        <div className="mb-8 px-2">
          <Logo size={32} withText />
          <p className="mt-1 pl-[42px] text-xs font-medium uppercase tracking-wider text-gray-400">
            Admin
          </p>
        </div>
        <nav className="space-y-1">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                section === id ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Icon />
              {label}
              {id === "reports" && pendingReports > 0 && (
                <span className="ml-auto rounded-full bg-amber-100 px-2 text-xs text-amber-700">
                  {pendingReports}
                </span>
              )}
            </button>
          ))}
        </nav>
        {isOwner ? (
          <Link
            to="/"
            className="mt-auto flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-gray-500 hover:bg-gray-50"
          >
            <FiArrowLeft /> Back to chats
          </Link>
        ) : (
          <button
            onClick={logout}
            className="mt-auto flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-gray-500 hover:bg-gray-50"
          >
            <FiLogOut /> Leave guest mode
          </button>
        )}
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/90 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            {isOwner && (
              <Link to="/" className="icon-btn -ml-2 lg:hidden" aria-label="Back">
                <FiArrowLeft />
              </Link>
            )}
            <h1 className="text-lg font-bold text-gray-900">
              {SECTIONS.find((s) => s.id === section)?.label}
            </h1>

            <div className="ml-auto flex items-center gap-2">
              {isOwner ? (
                <>
                  <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    <FiShield /> Admin
                  </span>
                  <button onClick={data.refresh} className="icon-btn" title="Refresh counts">
                    <FiRefreshCw />
                  </button>
                </>
              ) : (
                <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                  <FiEye />
                  <span className="hidden sm:inline">Guest · read only</span>
                  <span className="sm:hidden">Guest</span>
                </span>
              )}
              <button onClick={logout} className="icon-btn hover:text-red-500" title="Sign out">
                <FiLogOut />
              </button>
            </div>
          </div>

          <nav className="thin-scroll flex gap-1 overflow-x-auto px-3 pb-2 lg:hidden">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setSection(id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium ${
                  section === id ? "bg-indigo-50 text-indigo-700" : "text-gray-500"
                }`}
              >
                <Icon /> {label}
              </button>
            ))}
          </nav>
        </header>

        <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
          {isGuest && (
            <p className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <FiLock className="mt-0.5 flex-shrink-0" />
              <span>
                <strong className="font-semibold">You are logged in as guest.</strong> You can see
                the live dashboard, but you can&apos;t edit, delete, suspend or take any action.
                Emails are partly hidden and message counts are admin only.
              </span>
            </p>
          )}

          {section === "overview" && (
            <OverviewSection
              users={data.users}
              reports={data.reports}
              counts={data.counts}
              canEdit={isOwner}
              onOpen={setSection}
            />
          )}
          {section === "users" && (
            <UsersSection
              users={data.users}
              canEdit={isOwner}
              lockedMessage={GUEST_NOTICE}
              onSaveUser={saveUser}
            />
          )}
          {section === "reports" && (
            <ReportsSection
              reports={data.reports}
              users={data.users}
              canEdit={isOwner}
              actions={reportActions}
            />
          )}
          {section === "announcement" && (
            <AnnouncementSection
              announcement={data.announcement}
              canEdit={isOwner}
              onSave={publishAnnouncement}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminPage;
