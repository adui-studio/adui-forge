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
    const band1 = Math.abs(x - y * 0.55 - 30) < 10 ? 0.3 : 0;
    const band2 = Math.abs(x - y * 0.55 - 70) < 4 ? 0.45 : 0;
    const shade = 0.5 + 0.22 * (y / 314);
    const mix = Math.min(1, t + band1 + band2);
    return [
      lerp(PURPLE[0], GREEN[0], mix) * shade,
      lerp(PURPLE[1], GREEN[1], mix) * shade,
      lerp(PURPLE[2], GREEN[2], mix) * shade,
    ];
  }),
);

console.log("nsis images generated");
