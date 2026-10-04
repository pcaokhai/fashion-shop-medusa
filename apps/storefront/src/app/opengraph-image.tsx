/* eslint-disable vck/no-raw-values -- ImageResponse renders outside CSS: it cannot read var(--…) tokens, hex mirrors MASTER §1 */
import { ImageResponse } from "next/og";

export const alt = "VN Commerce";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Latin-only text: the default OG font has no Vietnamese glyphs.
export default function OpengraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#ECFDF5", color: "#064E3B" }}>
      <div style={{ fontSize: 96, fontWeight: 700 }}>VN Commerce</div>
      <div style={{ fontSize: 40, marginTop: 16, color: "#047857" }}>Online store demo</div>
    </div>,
    size,
  );
}
