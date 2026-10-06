import Image from "next/image";

// The two files were drawn with different margins, so each keeps its own
// proportion — sharing one would squash the white mark.
const LIGHT = { src: "/takt-logo.png", w: 640, h: 163 };
const DARK = { src: "/takt-logo-branco.png", w: 360, h: 114 };

/**
 * Both assets ship and CSS picks one, rather than a client component reading
 * the theme: the mark has to be right in the first paint, and the navy logo
 * on a dark panel is invisible.
 */
export function Logo({ height = 34 }: { height?: number }) {
  return (
    <>
      {([
        [LIGHT, "only-light"],
        [DARK, "only-dark"],
      ] as const).map(([file, klass]) => (
        <Image
          key={file.src}
          src={file.src}
          alt="TAKT Assessoria"
          width={Math.round((height * file.w) / file.h)}
          height={height}
          priority
          className={klass}
        />
      ))}
    </>
  );
}
