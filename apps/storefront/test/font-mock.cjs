// Offline build smoke (webpack only: Turbopack still fetches the woff2 files):
//   NEXT_FONT_GOOGLE_MOCKED_RESPONSES=$PWD/test/font-mock.cjs next build --webpack
// With network, plain `next build` (Turbopack) works.
// Maps the exact CSS URL next/font requests (weights 400-700, display swap) to a stub with the Vietnamese range.
const url = "https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap";
const face = (weight, range) => `@font-face {
  font-family: 'Be Vietnam Pro';
  font-style: normal;
  font-weight: ${weight};
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/bevietnampro/mock-${weight}.woff2) format('woff2');
  unicode-range: ${range};
}`;
const vi = "U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB";
module.exports = { [url]: [400, 500, 600, 700].map((w) => face(w, vi)).join("\n") };
