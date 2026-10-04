// Generates the in-repo placeholder product images (5 shapes x 8 colours x 2 views = 80 JPGs) into tools/seed/assets/.
// Original artwork, no third-party licence. B1b replaces these with licensed photos (see ASSETS.md).
// Run: pnpm --filter @vck/seed assets
import { mkdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const OUT = fileURLToPath(new URL("../assets/", import.meta.url))
const COLOURS: Record<string, string> = {
  den: "#1F1F23", trang: "#FAFAF7", be: "#D9C7A9", "xanh-navy": "#1F3558", "xanh-reu": "#55633F", nau: "#7A5233", "hong-phan": "#EBB9C3", xam: "#8E9096",
}
const BACKDROPS = ["#F3EFE8", "#E9EEF2", "#EFE9EE", "#E8EFE9"]
const SHAPES: Record<string, string> = {
  top: `<path d="M250 250 L330 215 Q400 265 470 215 L550 250 L650 360 L580 410 L550 380 L550 800 L250 800 L250 380 L220 410 L150 360 Z"/>`,
  bottom: `<path d="M290 200 H510 L560 800 H430 L400 420 L370 800 H240 Z"/><rect x="290" y="200" width="220" height="34" rx="6" fill-opacity=".14" fill="#000"/>`,
  dress: `<path d="M340 180 L400 235 L460 180 L520 260 L490 420 L600 840 H200 L310 420 L280 260 Z"/>`,
  shoe: `<path d="M150 560 Q150 450 260 440 L360 470 Q470 480 560 520 Q690 540 690 620 V670 H150 Z"/><path d="M140 670 H700 V705 Q700 725 680 725 H160 Q140 725 140 705 Z" fill="#F6F6F2"/>`,
  accessory: `<path d="M240 420 H560 L585 820 H215 Z"/><path d="M310 420 Q310 250 400 250 Q490 250 490 420" fill="none" stroke="currentColor" stroke-width="22" stroke-linecap="round"/>`,
}

function svg(shape: string, colour: string, backdrop: string, view: 1 | 2): string {
  const shapeSvg = SHAPES[shape] ?? ""
  const body = shapeSvg.replace(/<path d="([^"]+)"(?![^>]*stroke)/g, `<path stroke="#000" stroke-opacity=".14" stroke-width="3" d="$1"`)
  const transform = view === 1 ? "" : `transform="translate(400 520) scale(1.45) translate(-400 -470)"`
  const texture =
    view === 2
      ? `<g stroke="#000" stroke-opacity=".05" stroke-width="2">${Array.from({ length: 30 }, (_, i) => `<line x1="${-100 + i * 40}" y1="0" x2="${300 + i * 40}" y2="1000"/>`).join("")}</g>`
      : ""
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient></defs>
<rect width="800" height="1000" fill="${backdrop}"/>
${view === 1 ? `<ellipse cx="400" cy="880" rx="230" ry="26" fill="#000" fill-opacity=".1"/>` : ""}
<g ${transform} fill="${colour}" color="${colour}">${body}</g>
<g ${transform} fill="url(#g)" style="mix-blend-mode:multiply" opacity=".6">${shapeSvg.split("/>")[0]}/></g>
${texture}
</svg>`
}

mkdirSync(OUT, { recursive: true })
let n = 0
for (const [shape] of Object.entries(SHAPES)) {
  let b = 0
  for (const [colour, hex] of Object.entries(COLOURS)) {
    const backdrop = BACKDROPS[b++ % BACKDROPS.length] ?? "#F3EFE8"
    for (const view of [1, 2] as const) {
      await sharp(Buffer.from(svg(shape, hex, backdrop, view))).jpeg({ quality: 82, mozjpeg: true }).toFile(`${OUT}${shape}-${colour}-${view}.jpg`)
      n++
    }
  }
}
console.log(`wrote ${n} images to tools/seed/assets/`)
