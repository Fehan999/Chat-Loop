import Logo from "../brand/Logo";

const SplashScreen = ({ label = "Loading..." }) => (
  <div className="flex h-[100dvh] flex-col items-center justify-center gap-4 bg-gray-50">
    <div className="animate-pulse">
      <Logo size={56} />
    </div>
    <p className="text-sm text-gray-400">{label}</p>
  </div>
);

export default SplashScreen;
