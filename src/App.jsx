import { onAuthStateChanged } from "firebase/auth";
import { lazy, Suspense, useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AuthPage from "./components/auth/AuthPage";
import ResetPasswordPage from "./components/auth/ResetPasswordPage";
import SplashScreen from "./components/common/SplashScreen";
import { auth } from "./firebase/config";
import { initializeUserStatus } from "./service/userStatus";

// the dashboard and admin panel are only downloaded when needed,
// so the login page stays light
const ChatDashboard = lazy(() => import("./components/chat/ChatDashboard"));
const AdminPage = lazy(() => import("./components/admin/AdminPage"));

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => initializeUserStatus(), []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return <SplashScreen />;

  return (
    <BrowserRouter>
      <Suspense fallback={<SplashScreen />}>
        <Routes>
          <Route
            path="/"
            element={user ? <ChatDashboard user={user} /> : <Navigate to="/auth" replace />}
          />
          <Route path="/auth" element={!user ? <AuthPage /> : <Navigate to="/" replace />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/admin" element={<AdminPage user={user} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          className: "!rounded-xl !text-sm !shadow-lg",
          success: { iconTheme: { primary: "#6366f1", secondary: "#fff" } },
        }}
      />
    </BrowserRouter>
  );
}

export default App;
