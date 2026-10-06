import Image from "next/image";

// Same artwork, same proportion: the white file carried transparent padding
// (6% at the sides, 17% above), which at a given height drew the mark three
// tenths smaller than the navy one beside it. Cropped to its artwork, so a
// height set here means the same mark in either theme.
const LIGHT = { src: "/takt-logo.png", w: 640, h: 163 };
const DARK = { src: "/takt-logo-branco.png", w: 314, h: 80 };

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
