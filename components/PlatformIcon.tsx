import { getPlatform } from "@/lib/platforms";

export function PlatformIcon({ platform, size = 22 }: { platform: string; size?: number }) {
  const p = getPlatform(platform);
  if (!p.path) {
    return (
      <span className="pi-fallback" style={{ width: size, height: size, background: `#${p.color}` }} aria-hidden>
        {platform === "email" ? "@" : platform === "web" ? "🌐" : p.name[0]}
      </span>
    );
  }
  return (
    <svg role="img" aria-label={p.name} width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d={p.path} />
    </svg>
  );
}
