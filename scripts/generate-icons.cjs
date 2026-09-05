const { Resvg } = require("@resvg/resvg-js");
const { PNG } = require("pngjs");
const fs = require("fs");

const svg = fs.readFileSync("C:/Users/ADui/Pictures/adui-studio-logo.svg", "utf8");

// 1024 主图标(Flutter launcher 用,透明底)
const r1024 = new Resvg(svg, { fitTo: { mode: "width", value: 1024 } });
fs.writeFileSync("apps/mobile/assets/icon-1024.png", r1024.render().asPng());

// 32 图标(Tauri)
const r32 = new Resvg(svg, { fitTo: { mode: "width", value: 32 } });
fs.writeFileSync("apps/desktop/src-tauri/icons/32x32.png", r32.render().asPng());

// 32 PNG → BMP 格式 ICO(rc.exe 兼容,和之前验证过的方式一致)
const png = PNG.sync.read(fs.readFileSync("apps/desktop/src-tauri/icons/32x32.png"));
const w = png.width,
  h = png.height;
const pixels = Buffer.alloc(w * h * 4);
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const si = (y * w + x) * 4; // PNG top-down RGBA
    const di = ((h - 1 - y) * w + x) * 4; // ICO bottom-up BGRA
    pixels[di] = png.data[si + 2];
    pixels[di + 1] = png.data[si + 1];
    pixels[di + 2] = png.data[si];
    pixels[di + 3] = png.data[si + 3];
  }
}
const maskRow = Math.ceil(w / 8 / 4) * 4;
const andMask = Buffer.alloc(maskRow * h);
const header = Buffer.alloc(40);
header.writeUInt32LE(40, 0);
header.writeInt32LE(w, 4);
header.writeInt32LE(h * 2, 8);
header.writeUInt16LE(1, 12);
header.writeUInt16LE(32, 14);
const image = Buffer.concat([header, pixels, andMask]);
const icondir = Buffer.alloc(6);
icondir.writeUInt16LE(0, 0);
icondir.writeUInt16LE(1, 2);
icondir.writeUInt16LE(1, 4);
const entry = Buffer.alloc(16);
entry[0] = w;
entry[1] = h;
entry.writeUInt16LE(1, 4);
entry.writeUInt16LE(32, 6);
entry.writeUInt32LE(image.length, 8);
entry.writeUInt32LE(6 + 16, 12);
fs.writeFileSync("apps/desktop/src-tauri/icons/icon.ico", Buffer.concat([icondir, entry, image]));
console.log("icons generated");
