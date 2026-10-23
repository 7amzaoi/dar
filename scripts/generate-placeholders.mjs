// Generates the art-directed SVG placeholder imagery in /public/images.
// Run with: node scripts/generate-placeholders.mjs
// Output is committed; this script only needs re-running if the art changes.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "public", "images");

/* ---------- colour helpers ---------- */
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex([r, g, b]) {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}
/** amt in [-1, 1]: negative darkens, positive lightens */
function shade(hex, amt) {
  const rgb = hexToRgb(hex);
  return rgbToHex(rgb.map((v) => (amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
}

/* ---------- palettes ---------- */
const TONES = {
  // Cool, airy rooms (light grey / mist) to sit with the hero's palette; the furniture keeps its own colour.
  ivory: { wall: "#ECEEF1", floor: "#D8DCE2", main: "#D9D2C6", wood: "#8A6A4E", accent: "#C7A55E", linen: "#F7F8FA" },
  sage: { wall: "#E4E8E6", floor: "#CDD3D0", main: "#8E9A86", wood: "#6B5240", accent: "#C7A55E", linen: "#F4F6F5" },
  terracotta: { wall: "#EDEAE8", floor: "#D6D2CF", main: "#C07A5E", wood: "#5E4535", accent: "#C7A55E", linen: "#F6F4F2" },
  espresso: { wall: "#2B3242", floor: "#1F2532", main: "#9A7B63", wood: "#2A2019", accent: "#C7A55E", linen: "#E4E7ED" },
  stone: { wall: "#E7E9EC", floor: "#CFD3DA", main: "#A3A6AD", wood: "#7A6656", accent: "#B79A64", linen: "#F5F6F8" },
  ink: { wall: "#283246", floor: "#1C2333", main: "#6E8296", wood: "#4A3A2E", accent: "#C7A55E", linen: "#DDE2EA" },
};

/* ---------- shared defs ---------- */
function defs(t, id) {
  const dark = shade(t.wall, -0.5);
  return `<defs>
  <radialGradient id="light-${id}" cx="0.22" cy="0.18" r="0.9">
    <stop offset="0" stop-color="${shade(t.wall, 0.35)}"/>
    <stop offset="0.55" stop-color="${t.wall}"/>
    <stop offset="1" stop-color="${shade(t.wall, -0.12)}"/>
  </radialGradient>
  <linearGradient id="floor-${id}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${shade(t.floor, -0.08)}"/>
    <stop offset="1" stop-color="${shade(t.floor, 0.06)}"/>
  </linearGradient>
  <linearGradient id="sheen-${id}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/>
    <stop offset="0.6" stop-color="#ffffff" stop-opacity="0"/>
    <stop offset="1" stop-color="#000000" stop-opacity="0.14"/>
  </linearGradient>
  <linearGradient id="beam-${id}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#ffffff" stop-opacity="0.28"/>
    <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
  </linearGradient>
  <radialGradient id="glow-${id}" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#FFE9C2" stop-opacity="0.75"/>
    <stop offset="1" stop-color="#FFE9C2" stop-opacity="0"/>
  </radialGradient>
  <filter id="blur-${id}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="18"/></filter>
  <filter id="soft-${id}" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="4"/></filter>
  <linearGradient id="mirror-${id}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${shade(t.wall, 0.25)}"/>
    <stop offset="0.5" stop-color="${shade(t.wall, -0.1)}"/>
    <stop offset="1" stop-color="${dark}"/>
  </linearGradient>
</defs>`;
}

/* ---------- room backdrop (1200 x 1500 canvas, floor at y=1080) ---------- */
function room(t, id, { arch = false, w = 1200, h = 1500, floorY = 1080 } = {}) {
  let s = `<rect width="${w}" height="${h}" fill="url(#light-${id})"/>`;
  if (arch) {
    const aw = w * 0.5, ax = (w - aw) / 2, top = floorY * 0.18;
    s += `<path d="M${ax} ${floorY} V${top + aw / 2} A${aw / 2} ${aw / 2} 0 0 1 ${ax + aw} ${top + aw / 2} V${floorY} Z" fill="${shade(t.wall, -0.07)}"/>`;
  }
  // window light beam
  s += `<path d="M${w * 0.05} 0 L${w * 0.32} 0 L${w * 0.78} ${floorY} L${w * 0.42} ${floorY} Z" fill="url(#beam-${id})" opacity="0.55"/>`;
  // skirting + floor
  s += `<rect y="${floorY - 14}" width="${w}" height="14" fill="${shade(t.wall, -0.1)}"/>`;
  s += `<rect y="${floorY}" width="${w}" height="${h - floorY}" fill="url(#floor-${id})"/>`;
  return s;
}

function shadow(id, cx, cy, rx, ry = 34, o = 0.32) {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#000" opacity="${o}" filter="url(#blur-${id})"/>`;
}
const r = (x, y, w, h, fill, rx = 0, extra = "") =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${extra}/>`;

/* ---------- furniture pieces (drawn on 1200-wide stage, floor y=1080) ---------- */
const PIECES = {
  sofa(t, id) {
    const m = t.main, d = shade(m, -0.18), l = shade(m, 0.1);
    return [
      shadow(id, 600, 1085, 430),
      r(250, 1040, 18, 42, t.wood, 4), r(932, 1040, 18, 42, t.wood, 4),
      r(230, 700, 740, 240, d, 44),
      r(210, 880, 780, 172, m, 30),
      r(180, 790, 120, 262, shade(m, -0.08), 46), r(900, 790, 120, 262, shade(m, -0.08), 46),
      r(298, 728, 296, 158, l, 34), r(606, 728, 296, 158, l, 34),
      r(292, 852, 302, 92, shade(m, 0.05), 26), r(606, 852, 302, 92, shade(m, 0.05), 26),
      `<rect x="330" y="760" width="130" height="120" rx="24" fill="${t.accent}" transform="rotate(-9 395 820)"/>`,
      r(180, 700, 840, 352, `url(#sheen-${id})`, 40),
    ].join("");
  },
  sectional(t, id) {
    const m = t.main, d = shade(m, -0.18), l = shade(m, 0.1);
    return [
      shadow(id, 600, 1090, 520),
      r(130, 690, 940, 240, d, 44),
      r(110, 870, 980, 180, m, 30),
      r(80, 790, 120, 262, shade(m, -0.08), 46),
      r(200, 720, 280, 160, l, 34), r(490, 720, 280, 160, l, 34), r(780, 720, 270, 160, l, 34),
      r(760, 930, 360, 140, shade(m, 0.04), 30),
      r(196, 850, 560, 90, shade(m, 0.05), 26),
      `<rect x="860" y="752" width="120" height="112" rx="22" fill="${t.accent}" transform="rotate(7 920 808)"/>`,
      r(80, 690, 1040, 380, `url(#sheen-${id})`, 40),
    ].join("");
  },
  armchair(t, id) {
    const m = t.main, d = shade(m, -0.16);
    return [
      shadow(id, 600, 1085, 250),
      `<path d="M440 1080 L455 1010 M760 1080 L745 1010" stroke="${t.wood}" stroke-width="16" stroke-linecap="round"/>`,
      `<path d="M395 860 C395 640 470 560 600 560 C730 560 805 640 805 860 Z" fill="${d}"/>`,
      r(380, 840, 440, 180, m, 40),
      `<path d="M380 800 C330 820 330 1000 380 1020 L440 1020 L440 820 Z" fill="${shade(m, -0.07)}"/>`,
      `<path d="M820 800 C870 820 870 1000 820 1020 L760 1020 L760 820 Z" fill="${shade(m, -0.07)}"/>`,
      r(440, 860, 320, 80, shade(m, 0.07), 26),
      `<path d="M395 860 C395 640 470 560 600 560 C730 560 805 640 805 860 Z" fill="url(#sheen-${id})"/>`,
      r(330, 800, 540, 220, `url(#sheen-${id})`, 40),
    ].join("");
  },
  bed(t, id) {
    const m = t.main, lin = t.linen;
    const tufts = Array.from({ length: 9 }, (_, i) => `<line x1="${290 + i * 78}" y1="640" x2="${290 + i * 78}" y2="880" stroke="${shade(m, -0.15)}" stroke-width="3"/>`).join("");
    return [
      shadow(id, 600, 1088, 470),
      r(240, 600, 720, 420, m, 26), tufts,
      r(240, 600, 720, 420, `url(#sheen-${id})`, 26),
      r(320, 790, 240, 110, shade(lin, -0.02), 30), r(640, 790, 240, 110, shade(lin, -0.02), 30),
      r(390, 830, 160, 84, t.accent, 22),
      r(200, 880, 800, 190, lin, 22),
      r(200, 960, 800, 66, shade(t.accent, 0.15), 6),
      r(200, 880, 800, 190, `url(#sheen-${id})`, 22),
      r(40, 860, 140, 210, t.wood, 8), r(56, 910, 108, 6, shade(t.wood, 0.25), 3),
      `<path d="M70 860 L80 790 L140 790 L150 860 Z" fill="${shade(lin, -0.05)}"/>`,
      `<circle cx="110" cy="800" r="70" fill="url(#glow-${id})"/>`,
      r(1020, 860, 140, 210, t.wood, 8), r(1036, 910, 108, 6, shade(t.wood, 0.25), 3),
    ].join("");
  },
  nightstand(t, id) {
    const w = t.wood;
    return [
      shadow(id, 600, 1085, 220),
      r(420, 1040, 14, 40, t.accent, 3), r(766, 1040, 14, 40, t.accent, 3),
      r(400, 760, 400, 290, w, 12),
      r(420, 790, 360, 110, shade(w, 0.08), 6), r(420, 920, 360, 110, shade(w, 0.08), 6),
      `<circle cx="600" cy="845" r="9" fill="${t.accent}"/><circle cx="600" cy="975" r="9" fill="${t.accent}"/>`,
      r(400, 760, 400, 290, `url(#sheen-${id})`, 12),
      `<ellipse cx="560" cy="755" rx="44" ry="10" fill="${shade(t.main, -0.1)}"/>`,
      `<path d="M545 755 L552 620 L568 620 L575 755 Z" fill="${shade(t.main, -0.1)}"/>`,
      `<path d="M490 620 L515 520 L605 520 L630 620 Z" fill="${t.linen}"/>`,
      `<circle cx="560" cy="580" r="150" fill="url(#glow-${id})"/>`,
      r(660, 728, 90, 28, t.accent, 3), r(668, 704, 76, 24, shade(t.main, 0.1), 3),
    ].join("");
  },
  wardrobe(t, id) {
    const w = t.wood;
    const flutes = Array.from({ length: 14 }, (_, i) => `<line x1="${360 + i * 36}" y1="370" x2="${360 + i * 36}" y2="1030" stroke="${shade(w, -0.2)}" stroke-width="3"/>`).join("");
    return [
      shadow(id, 600, 1086, 330),
      r(330, 330, 540, 730, w, 6), flutes,
      `<line x1="600" y1="340" x2="600" y2="1050" stroke="${shade(w, -0.35)}" stroke-width="5"/>`,
      r(578, 640, 8, 120, t.accent, 4), r(614, 640, 8, 120, t.accent, 4),
      r(330, 330, 540, 730, `url(#sheen-${id})`, 6),
      r(350, 1060, 20, 20, w), r(830, 1060, 20, 20, w),
    ].join("");
  },
  "dining-table"(t, id) {
    const w = t.wood, m = t.main;
    const chair = (x) => [
      `<path d="M${x} 760 L${x} 600 C${x} 560 ${x + 150} 560 ${x + 150} 600 L${x + 150} 760 Z" fill="${shade(m, -0.05)}"/>`,
      `<path d="M${x} 760 L${x} 600 C${x} 560 ${x + 150} 560 ${x + 150} 600 L${x + 150} 760 Z" fill="url(#sheen-${id})"/>`,
    ].join("");
    return [
      shadow(id, 600, 1088, 470),
      chair(260), chair(525), chair(790),
      r(160, 760, 880, 40, w, 10),
      r(160, 760, 880, 40, `url(#sheen-${id})`, 10),
      `<path d="M300 800 L340 800 L320 1078 L300 1078 Z M860 800 L900 800 L900 1078 L880 1078 Z" fill="${shade(w, -0.12)}"/>`,
      `<path d="M520 760 Q560 700 600 700 Q640 700 680 760 Z" fill="${t.linen}"/>`,
      `<path d="M585 700 L560 600 M605 700 L640 590 M595 700 L600 580" stroke="${shade(t.main, -0.4)}" stroke-width="5" stroke-linecap="round"/>`,
    ].join("");
  },
  "dining-chair"(t, id) {
    const w = t.wood, m = t.main;
    return [
      shadow(id, 600, 1086, 220),
      `<path d="M460 1078 L475 880 M740 1078 L725 880 M500 1078 L510 900 M700 1078 L690 900" stroke="${w}" stroke-width="20" stroke-linecap="round"/>`,
      `<path d="M470 880 L470 560 C470 500 730 500 730 560 L730 880 Z" fill="${shade(w, 0.05)}"/>`,
      `<path d="M495 860 L495 580 C495 540 705 540 705 580 L705 860 Z" fill="${shade(m, -0.05)}"/>`,
      r(430, 850, 340, 70, m, 18),
      r(430, 850, 340, 70, `url(#sheen-${id})`, 18),
      `<path d="M470 880 L470 560 C470 500 730 500 730 560 L730 880 Z" fill="url(#sheen-${id})"/>`,
    ].join("");
  },
  sideboard(t, id) {
    const w = t.wood;
    const flutes = Array.from({ length: 22 }, (_, i) => `<line x1="${215 + i * 36}" y1="790" x2="${215 + i * 36}" y2="1010" stroke="${shade(w, -0.2)}" stroke-width="3"/>`).join("");
    return [
      shadow(id, 600, 1086, 450),
      r(180, 760, 840, 270, w, 10), flutes,
      `<line x1="390" y1="770" x2="390" y2="1020" stroke="${shade(w, -0.35)}" stroke-width="4"/><line x1="600" y1="770" x2="600" y2="1020" stroke="${shade(w, -0.35)}" stroke-width="4"/><line x1="810" y1="770" x2="810" y2="1020" stroke="${shade(w, -0.35)}" stroke-width="4"/>`,
      r(180, 760, 840, 270, `url(#sheen-${id})`, 10),
      `<path d="M220 1030 L230 1078 M980 1030 L970 1078" stroke="${t.accent}" stroke-width="10" stroke-linecap="round"/>`,
      `<path d="M330 760 C300 700 300 640 340 600 L370 600 C410 640 410 700 380 760 Z" fill="${t.linen}"/>`,
      `<path d="M355 600 C350 520 330 470 300 430 M355 600 C380 500 420 470 440 440" stroke="${shade(t.wood, -0.3)}" stroke-width="4" fill="none"/>`,
      `<circle cx="820" cy="610" r="150" fill="${t.accent}" opacity="0.85"/>`,
      `<circle cx="820" cy="610" r="132" fill="url(#mirror-${id})"/>`,
      r(700, 740, 70, 20, shade(t.main, -0.1), 4), r(710, 722, 56, 18, t.accent, 4),
    ].join("");
  },
  desk(t, id) {
    const w = t.wood;
    return [
      shadow(id, 600, 1086, 420),
      r(210, 760, 780, 34, w, 8),
      r(210, 760, 780, 34, `url(#sheen-${id})`, 8),
      `<path d="M250 794 L270 1078 L300 1078 L290 794 Z M910 794 L900 1078 L930 1078 L950 794 Z" fill="${shade(w, -0.15)}"/>`,
      r(680, 794, 240, 150, shade(w, 0.06), 6), r(700, 860, 200, 4, shade(w, -0.25)),
      `<circle cx="800" cy="830" r="7" fill="${t.accent}"/>`,
      `<path d="M330 760 L360 560 M360 560 L470 520" stroke="${t.accent}" stroke-width="10" stroke-linecap="round" fill="none"/>`,
      `<path d="M440 500 L520 500 L540 560 L420 560 Z" fill="${t.accent}"/>`,
      `<circle cx="480" cy="600" r="120" fill="url(#glow-${id})"/>`,
      r(600, 730, 150, 30, t.main, 3), r(612, 704, 130, 26, t.linen, 3), r(605, 682, 140, 22, shade(t.main, -0.2), 3),
    ].join("");
  },
  "office-chair"(t, id) {
    const m = t.main;
    return [
      shadow(id, 600, 1086, 230),
      `<path d="M600 960 L600 1040 M600 1040 L440 1066 M600 1040 L760 1066 M600 1040 L520 1074 M600 1040 L680 1074" stroke="${shade(t.wood, -0.1)}" stroke-width="16" stroke-linecap="round"/>`,
      `<circle cx="440" cy="1068" r="12" fill="#222"/><circle cx="760" cy="1068" r="12" fill="#222"/><circle cx="520" cy="1076" r="10" fill="#222"/><circle cx="680" cy="1076" r="10" fill="#222"/>`,
      r(470, 880, 260, 80, m, 26),
      `<path d="M490 880 L480 520 C480 450 720 450 720 520 L710 880 Z" fill="${shade(m, -0.08)}"/>`,
      `<path d="M490 880 L480 520 C480 450 720 450 720 520 L710 880 Z" fill="url(#sheen-${id})"/>`,
      `<path d="M460 820 L460 880 M740 820 L740 880" stroke="${shade(t.wood, -0.1)}" stroke-width="12" stroke-linecap="round"/>`,
      r(430, 800, 70, 22, shade(m, -0.15), 10), r(700, 800, 70, 22, shade(m, -0.15), 10),
    ].join("");
  },
  bookshelf(t, id) {
    const w = t.wood;
    const shelves = [440, 600, 760, 920].map((y) => r(330, y, 540, 16, shade(w, 0.08))).join("");
    const palette = [t.accent, t.main, shade(t.main, -0.25), t.linen, shade(t.accent, -0.2)];
    let books = "";
    [440, 600, 760, 920].forEach((y, row) => {
      let x = 350 + row * 22;
      for (let i = 0; i < 7; i++) {
        const bw = 22 + ((i * 7 + row * 5) % 18), bh = 90 + ((i * 13 + row * 3) % 40);
        if (x + bw > 840) break;
        if ((i + row) % 4 === 3) { x += 40; continue; }
        books += r(x, y - bh, bw, bh, palette[(i + row) % palette.length], 2);
        x += bw + 3;
      }
    });
    return [
      shadow(id, 600, 1086, 320),
      r(310, 280, 580, 790, shade(w, -0.2), 6),
      r(330, 300, 540, 750, shade(w, -0.35), 2),
      shelves, books,
      r(310, 280, 580, 790, `url(#sheen-${id})`, 6),
    ].join("");
  },
  lamp(t, id) {
    return [
      shadow(id, 600, 1084, 140, 22),
      `<ellipse cx="600" cy="1070" rx="90" ry="16" fill="${shade(t.wood, -0.1)}"/>`,
      `<path d="M600 1070 L600 520" stroke="${t.accent}" stroke-width="10"/>`,
      `<circle cx="600" cy="460" r="300" fill="url(#glow-${id})"/>`,
      `<path d="M470 560 L520 340 L680 340 L730 560 Z" fill="${t.linen}"/>`,
      Array.from({ length: 9 }, (_, i) => `<line x1="${520 + i * 20}" y1="340" x2="${470 + i * 32.5}" y2="560" stroke="${shade(t.linen, -0.12)}" stroke-width="2"/>`).join(""),
      `<path d="M470 560 L520 340 L680 340 L730 560 Z" fill="url(#sheen-${id})"/>`,
      r(430, 920, 120, 150, shade(t.main, -0.05), 60),
    ].join("");
  },
  mirror(t, id) {
    return [
      shadow(id, 600, 1084, 240, 24),
      `<path d="M380 1070 V520 A220 220 0 0 1 820 520 V1070 Z" fill="${t.accent}"/>`,
      `<path d="M400 1056 V522 A200 200 0 0 1 800 522 V1056 Z" fill="url(#mirror-${id})"/>`,
      `<path d="M460 1000 L720 420" stroke="#fff" stroke-opacity="0.25" stroke-width="40"/>`,
      `<path d="M540 1030 L760 560" stroke="#fff" stroke-opacity="0.15" stroke-width="16"/>`,
      `<path d="M180 1078 C170 980 190 900 230 860 L270 860 C310 900 330 980 320 1078 Z" fill="${t.main}"/>`,
      `<path d="M250 860 C240 760 200 700 150 660 M250 860 C270 740 330 690 360 650 M250 860 C250 760 260 700 250 620" stroke="${shade(t.wood, -0.2)}" stroke-width="4" fill="none"/>`,
    ].join("");
  },
  vase(t, id) {
    return [
      shadow(id, 600, 1084, 330, 26),
      r(240, 920, 720, 160, shade(t.wood, 0.05), 6),
      r(240, 920, 720, 160, `url(#sheen-${id})`, 6),
      `<path d="M330 920 C280 840 290 700 360 640 L380 600 L420 600 L440 640 C510 700 520 840 470 920 Z" fill="${t.main}"/>`,
      `<path d="M330 920 C280 840 290 700 360 640 L380 600 L420 600 L440 640 C510 700 520 840 470 920 Z" fill="url(#sheen-${id})"/>`,
      `<path d="M400 600 C390 480 340 380 280 300 M400 600 C430 470 500 400 560 330 M400 600 C400 500 420 420 410 330" stroke="${shade(t.wood, -0.25)}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
      `<ellipse cx="640" cy="860" rx="80" ry="62" fill="${t.linen}"/>`,
      `<path d="M560 920 C560 870 720 870 720 920 Z" fill="${t.linen}"/>`,
      `<path d="M760 920 C740 860 750 790 790 760 L800 720 L840 720 L850 760 C890 790 900 860 880 920 Z" fill="${t.accent}"/>`,
      `<path d="M760 920 C740 860 750 790 790 760 L800 720 L840 720 L850 760 C890 790 900 860 880 920 Z" fill="url(#sheen-${id})"/>`,
    ].join("");
  },
};

/* ---------- product image (1200x1500) ---------- */
function productSvg(kind, toneName, variant) {
  const t = TONES[toneName];
  const id = `${kind}-${toneName}-${variant}`.replace(/[^a-z0-9-]/g, "");
  const piece = PIECES[kind](t, id);
  let body;
  let viewBox = "0 0 1200 1500";
  if (variant === "a") {
    body = room(t, id) + piece;
  } else if (variant === "b") {
    body = room(t, id, { arch: true }) + `<g transform="translate(1200 0) scale(-1 1)">${piece}</g>`;
  } else {
    // detail crop
    body = room(t, id) + piece;
    viewBox = "260 560 680 850";
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" preserveAspectRatio="xMidYMid slice">${defs(t, id)}${body}</svg>`;
}

/* ---------- scenes (landscape, for hero + collections) ---------- */
function sceneSvg(name, toneName, pieces, { w = 1600, h = 1000, arch = true } = {}) {
  const t = TONES[toneName];
  const id = `scene-${name}`;
  const floorY = h * 0.78;
  const scale = floorY / 1080;
  let body = room(t, id, { w, h, floorY, arch });
  for (const p of pieces) {
    const s = scale * (p.s ?? 1);
    const tx = p.x - 600 * s;
    const ty = floorY - 1080 * s;
    const flip = p.flip ? `translate(${2 * p.x} 0) scale(-1 1) ` : "";
    body += `<g transform="${flip}translate(${tx} ${ty}) scale(${s})">${PIECES[p.kind](t, id)}</g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">${defs(t, id)}${body}</svg>`;
}

/* ---------- write ---------- */
mkdirSync(join(OUT, "products"), { recursive: true });
mkdirSync(join(OUT, "scenes"), { recursive: true });

let count = 0;
for (const kind of Object.keys(PIECES)) {
  for (const tone of Object.keys(TONES)) {
    for (const variant of ["a", "b", "c"]) {
      writeFileSync(join(OUT, "products", `${kind}-${tone}-${variant}.svg`), productSvg(kind, tone, variant));
      count++;
    }
  }
}

const scenes = {
  "hero-living": ["ivory", [{ kind: "lamp", x: 260, s: 0.9 }, { kind: "sofa", x: 820, s: 1.05 }, { kind: "vase", x: 1360, s: 0.7 }]],
  "hero-dining": ["espresso", [{ kind: "dining-table", x: 760, s: 1.1 }, { kind: "sideboard", x: 1340, s: 0.6 }]],
  "hero-bedroom": ["stone", [{ kind: "bed", x: 800, s: 1.0 }, { kind: "lamp", x: 1400, s: 0.75 }]],
  "collection-sahel": ["terracotta", [{ kind: "armchair", x: 520, s: 1 }, { kind: "vase", x: 1100, s: 0.75 }]],
  "collection-nocturne": ["ink", [{ kind: "sectional", x: 780, s: 1 }, { kind: "lamp", x: 1400, s: 0.7 }]],
  "collection-andalus": ["ivory", [{ kind: "mirror", x: 560, s: 1 }, { kind: "sideboard", x: 1100, s: 0.75 }]],
  "collection-olive": ["sage", [{ kind: "dining-table", x: 800, s: 1 }]],
  "collection-studio": ["stone", [{ kind: "desk", x: 700, s: 1 }, { kind: "bookshelf", x: 1330, s: 0.7 }]],
  "collection-cedar": ["espresso", [{ kind: "wardrobe", x: 520, s: 0.85 }, { kind: "bed", x: 1150, s: 0.7 }]],
  "collection-dune": ["terracotta", [{ kind: "sofa", x: 800, s: 1 }]],
  "collection-atrium": ["sage", [{ kind: "armchair", x: 500, s: 0.9 }, { kind: "armchair", x: 1100, s: 0.9, flip: true }]],
  "cta-workshop": ["espresso", [{ kind: "bookshelf", x: 380, s: 0.8 }, { kind: "armchair", x: 1000, s: 1 }]],
};
for (const [name, [tone, pieces]] of Object.entries(scenes)) {
  writeFileSync(join(OUT, "scenes", `${name}.svg`), sceneSvg(name, tone, pieces));
  count++;
}

console.log(`Generated ${count} SVG placeholders in ${OUT}`);
