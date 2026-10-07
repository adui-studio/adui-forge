// 生成 NSIS 安装向导的品牌位图（24 位 BMP，无第三方依赖，执行后保留备复用）。
// headerImage 150x57：深底 + 电光绿渐变条；sidebarImage 164x314：深紫→电光绿对角渐变。
import { writeFileSync, mkdirSync } from "node:fs";

const encodeBmp = (width, height, pixelAt) => {
  // 24 位 BMP：bottom-up，BGR，每行 4 字节对齐
  const rowRaw = width * 3;
  const rowSize = Math.ceil(rowRaw / 4) * 4;
  const pixelBytes = rowSize * height;
  const fileSize = 54 + pixelBytes;
  const buffer = Buffer.alloc(fileSize, 0);
  // BITMAPFILEHEADER
  buffer.write("BM", 0, "ascii");
  buffer.writeUInt32LE(fileSize, 2);
  buffer.writeUInt32LE(54, 10);
  // BITMAPINFOHEADER
  buffer.writeUInt32LE(40, 14);
  buffer.writeInt32LE(width, 18);
  buffer.writeInt32LE(height, 22);
  buffer.writeUInt16LE(1, 26);
  buffer.writeUInt16LE(24, 28);
  buffer.writeUInt32LE(pixelBytes, 34);
  // 像素（bottom-up）
  for (let y = 0; y < height; y += 1) {
    const rowStart = 54 + (height - 1 - y) * rowSize;
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = pixelAt(x, y);
      const offset = rowStart + x * 3;
      buffer.writeUInt8(b, offset);
      buffer.writeUInt8(g, offset + 1);
      buffer.writeUInt8(r, offset + 2);
    }
  }
  return buffer;
};

const lerp = (a, b, t) => Math.round(a + (b - a) * t);
// 品牌渐变端点（与 logo 一致：深紫 #5b2b82 → 电光绿 #6cff00）
const PURPLE = [0x5b, 0x2b, 0x82];
const GREEN = [0x6c, 0xff, 0x00];
const DARK = [0x12, 0x14, 0x1a];

// —— 线段光栅化（圆头粗线）：点到线段距离场 ——
const strokePixel = (x, y, ax, ay, bx, by, halfWidth) => {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((x - ax) * dx + (y - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const px = ax + t * dx;
  const py = ay + t * dy;
  const dist = Math.hypot(x - px, y - py);
  return dist <= halfWidth;
};

// 品牌 A 字形（两斜线 + 横杠），在给定包围盒内
const logoAPixel = (x, y, cx, cy, scale) => {
  // 以 logo.svg 的 A 字比例简化：顶点/底脚/横杠
  const apexX = cx;
  const apexY = cy - 52 * scale;
  const leftX = cx - 44 * scale;
  const leftY = cy + 52 * scale;
  const rightX = cx + 44 * scale;
  const rightY = cy + 52 * scale;
  const barY = cy + 14 * scale;
  const barHalf = 11 * scale;
  const stroke = 9 * scale;
  if (strokePixel(x, y, apexX, apexY, leftX, leftY, stroke)) return true;
  if (strokePixel(x, y, apexX, apexY, rightX, rightY, stroke)) return true;
  if (strokePixel(x, y, cx - barHalf, barY, cx + barHalf, barY, stroke * 0.8)) return true;
  return false;
};

const outDir = "apps/desktop/src-tauri/icons/nsis";
mkdirSync(outDir, { recursive: true });

// headerImage 150x57：深底 + 左端品牌色块 + 斜切光带
writeFileSync(
  `${outDir}/headerImage.bmp`,
  encodeBmp(150, 57, (x, y) => {
    // 左端 28px 品牌色块（深紫→绿竖向渐变），其余深底 + 斜切光带
    if (x < 28) {
      const t = y / 57;
      return [
        lerp(PURPLE[0], GREEN[0], t),
        lerp(PURPLE[1], GREEN[1], t),
        lerp(PURPLE[2], GREEN[2], t),
      ];
    }
    const band = Math.abs(x - y * 2.2 - 20) < 14 ? 0.35 : 0;
    const fade = Math.max(0, (x - 28) / 122) * 0.25;
    const t = band + fade;
    return [
      lerp(DARK[0], GREEN[0], t * 0.9),
      lerp(DARK[1], GREEN[1], t * 0.9),
      lerp(DARK[2], GREEN[2], t * 0.9),
    ];
  }),
);

// sidebarImage 164x314：品牌渐变 + 双斜光带 + 底部压暗
writeFileSync(
  `${outDir}/sidebarImage.bmp`,
  encodeBmp(164, 314, (x, y) => {
    const t = (x / 164) * 0.5 + (y / 314) * 0.5;
    const shade = 0.5 + 0.22 * (y / 314);
    const mix = Math.min(1, t);
    // 中央品牌方块（圆角渐变底 + 白色 A）
    const bx = x - 38;
    const by = y - 96;
    if (bx >= 0 && bx <= 88 && by >= 0 && by <= 88) {
      const r = 16;
      const cxp = Math.max(r, Math.min(88 - r, bx));
      const cyp = Math.max(r, Math.min(88 - r, by));
      if (
        Math.hypot(bx - cxp, by - cyp) <= r ||
        (bx >= r && bx <= 88 - r) ||
        (by >= r && by <= 88 - r)
      ) {
        if (logoAPixel(x, y, 82, 140, 0.62)) return [0xff, 0xff, 0xff];
        const gt = (bx / 88 + by / 88) / 2;
        return [
          lerp(PURPLE[0], GREEN[0], gt) * 0.95,
          lerp(PURPLE[1], GREEN[1], gt) * 0.95,
          lerp(PURPLE[2], GREEN[2], gt) * 0.95,
        ];
      }
    }
    return [
      lerp(PURPLE[0], GREEN[0], mix) * shade,
      lerp(PURPLE[1], GREEN[1], mix) * shade,
      lerp(PURPLE[2], GREEN[2], mix) * shade,
    ];
  }),
);

console.log("nsis images generated");
