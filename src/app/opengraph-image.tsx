import { ImageResponse } from "next/og";
import { copy } from "@/content/copy";

export const alt = `${copy.brand.name} — ${copy.brand.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ZONES = ["#E5484D", "#F76B15", "#F5A524", "#4C9AFF", "#30A46C"];

/**
 * Fetches one weight of a Google Font as TTF, cut down to the glyphs in `text`.
 * Runs once at build time (the image is static). Returns null on any failure,
 * so the build never breaks and the image falls back to the default font.
 */
async function loadFont(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&text=${encodeURIComponent(text)}`)).text();
    const src = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!src) return null;
    const res = await fetch(src);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  // Same pairing as the site: Nunito for the display lines, Inter for the rest.
  const [nunito, inter] = await Promise.all([
    loadFont("Nunito", 800, copy.brand.name + copy.landing.title),
    loadFont("Inter", 500, copy.brand.tagline + copy.landing.kicker),
  ]);
  const fonts = [
    ...(nunito ? [{ name: "Nunito", data: nunito, weight: 800 as const, style: "normal" as const }] : []),
    ...(inter ? [{ name: "Inter", data: inter, weight: 500 as const, style: "normal" as const }] : []),
  ];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#FBF7F1", color: "#1B2140", fontFamily: "Inter" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 40, fontWeight: 800, fontFamily: "Nunito" }}>
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ width: 12, height: 40, borderRadius: 6, background: "#E5484D" }} />
            <div style={{ width: 12, height: 40, borderRadius: 6, background: "#F5A524" }} />
            <div style={{ width: 12, height: 40, borderRadius: 6, background: "#30A46C" }} />
          </div>
          {copy.brand.name}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.1, maxWidth: 980, fontFamily: "Nunito" }}>{copy.landing.title}</div>
          <div style={{ fontSize: 32, fontWeight: 500, color: "#655C55" }}>{copy.brand.tagline}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", height: 22, borderRadius: 11, overflow: "hidden" }}>
            {ZONES.map((c) => <div key={c} style={{ flex: 1, background: c }} />)}
          </div>
          <div style={{ fontSize: 26, fontWeight: 500, color: "#655C55" }}>{copy.landing.kicker}</div>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length > 0 ? fonts : undefined },
  );
}
