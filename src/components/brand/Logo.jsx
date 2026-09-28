// the chatloop mark: two linked rings (the loop) with a speech bubble tail.
// pure html/css so it scales with the `size` prop and needs no image request
const Logo = ({
  size = 36,
  withText = false,
  tone = "brand",
  className = "",
  textClassName = "",
}) => (
  <span className={`inline-flex items-center gap-2.5 ${className}`}>
    <span
      className={`cl-logo ${tone === "glass" ? "cl-logo--glass" : ""}`}
      style={{ "--cl-size": `${size}px` }}
      aria-hidden="true"
    >
      <span className="cl-logo__ring cl-logo__ring--a" />
      <span className="cl-logo__ring cl-logo__ring--b" />
      <span className="cl-logo__ring cl-logo__ring--a cl-logo__ring--over" />
      <span className="cl-logo__tail" />
    </span>
    {withText && (
      <span
        className={`cl-wordmark ${tone === "glass" ? "cl-wordmark--light" : ""} ${textClassName}`}
      >
        Chat<span>Loop</span>
      </span>
    )}
  </span>
);

export default Logo;
