import Image from "next/image";

const RATIO = 640 / 163;

export function Logo({ height = 34 }: { height?: number }) {
  return (
    <Image
      src="/takt-logo.png"
      alt="TAKT Assessoria"
      width={Math.round(height * RATIO)}
      height={height}
      priority
    />
  );
}
