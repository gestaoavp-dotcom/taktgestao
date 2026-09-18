const COLORS = {
  light: { ink: "#FFFFFF" },
  dark: { ink: "#132249" },
};

export function LogoMark({
  variant = "dark",
  size = 40,
}: {
  variant?: "light" | "dark";
  size?: number;
}) {
  const ink = COLORS[variant].ink;
  const s = size / 40;

  return (
    <div style={{ position: "relative", width: 40 * s, height: 34 * s, flexShrink: 0 }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 6 * s,
          width: 26 * s,
          height: 5 * s,
          background: ink,
          clipPath: "polygon(0 0, 100% 0, 84% 100%, 0% 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 11 * s,
          top: 6 * s,
          width: 5 * s,
          height: 28 * s,
          background: ink,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 11.5 * s,
          top: 17 * s,
          width: 32 * s,
          height: 5 * s,
          transform: "rotate(-52deg)",
          transformOrigin: "left center",
          display: "flex",
        }}
      >
        <div style={{ width: "24%", height: "100%", background: ink }} />
        <div style={{ width: "38%", height: "100%", background: "#2B5FF1" }} />
        <div style={{ width: "16%", height: "100%", background: "#F1BF44" }} />
        <div
          style={{
            width: "22%",
            height: "100%",
            background: ink,
            clipPath: "polygon(0 0, 100% 50%, 0 100%)",
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 11.5 * s,
          top: 17 * s,
          width: 28 * s,
          height: 5 * s,
          background: ink,
          transform: "rotate(52deg)",
          transformOrigin: "left center",
          clipPath: "polygon(0 0, 88% 0, 100% 50%, 88% 100%, 0 100%)",
        }}
      />
    </div>
  );
}

export function Logo({
  variant = "dark",
  showTagline = true,
}: {
  variant?: "light" | "dark";
  showTagline?: boolean;
}) {
  const textColor = variant === "light" ? "text-white" : "text-navy";

  return (
    <div className="flex items-center gap-2.5">
      <LogoMark variant={variant} size={30} />
      <div>
        <div className={`font-display font-bold text-lg leading-none tracking-tight ${textColor}`}>
          TAKT
        </div>
        {showTagline && (
          <div
            className={`font-display font-medium text-[7px] leading-none tracking-[2.5px] mt-0.5 ${textColor}`}
          >
            ASSESSORIA
          </div>
        )}
      </div>
    </div>
  );
}
