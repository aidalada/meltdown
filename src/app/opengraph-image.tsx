import { ImageResponse } from "next/og";
import { copy } from "@/content/copy";

export const alt = `${copy.brand.name} — ${copy.brand.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ZONES = ["#E5484D", "#F76B15", "#F5A524", "#4C9AFF", "#30A46C"];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#F6F7FB", color: "#1B2140" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 40, fontWeight: 800 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ width: 12, height: 40, borderRadius: 6, background: "#E5484D" }} />
            <div style={{ width: 12, height: 40, borderRadius: 6, background: "#F5A524" }} />
            <div style={{ width: 12, height: 40, borderRadius: 6, background: "#30A46C" }} />
          </div>
          {copy.brand.name}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.1, maxWidth: 980 }}>{copy.landing.title}</div>
          <div style={{ fontSize: 32, color: "#5B6478" }}>{copy.brand.tagline}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", height: 22, borderRadius: 11, overflow: "hidden" }}>
            {ZONES.map((c) => <div key={c} style={{ flex: 1, background: c }} />)}
          </div>
          <div style={{ fontSize: 26, color: "#5B6478" }}>{copy.landing.kicker}</div>
        </div>
      </div>
    ),
    size,
  );
}
