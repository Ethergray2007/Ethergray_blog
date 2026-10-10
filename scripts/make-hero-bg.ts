/**
 * 生成首页首屏的背景图
 * ============================================================
 * 从本地原图生成一张压缩过的成品，放进 public/。
 *
 * 【为什么需要这一步，而不让 Astro 直接处理原图】
 * 原图是 5.96 MB 的 PNG（3840×2160），而整个仓库才 7.36 MB。
 * 把它提交进去会让仓库体积翻倍，而且它是从 Wallpaper Engine 的
 * 素材里拿的，不一定是最终想长期保留的那张。
 *
 * 所以分两步：
 *   原图     留在本地，不进 git（.gitignore 里排除了）
 *   成品图   压缩后提交进 public/，约 200~300 KB
 *
 * 这样别人克隆仓库不会拖一个 6 MB 的图，
 * 而换成自己的图也只是重新跑一次这个脚本。
 *
 * 跑法：
 *   node scripts/make-hero-bg.ts
 *
 * 想换背景图？
 *   把自己的图放到 src/assets/images/hero-bg.png，再跑一次。
 *   脚本会按同样的尺寸和压缩质量生成 public/hero-bg.jpg。
 *
 * ⚠️ 当前这张图是从第三方素材里抽的帧，**授权状况未确认**。
 *    来源和替换建议记在 docs/ASSETS.md —— 真要公开挂站之前请先看那个文件。
 * ============================================================
 */
import { existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";

import sharp from "sharp";

/** 原图位置（不进 git） */
const SOURCE = "src/assets/images/hero-bg.png";

/** 成品位置（进 git，页面直接引用） */
const OUTPUT = "public/hero-bg.jpg";

/**
 * 输出宽度。
 *
 * 1920 是常见桌面显示器的宽度上限 ——
 * 再宽对首屏背景没有可见收益，只是白白增加体积。
 * 首屏是 object-fit: cover 的，窄屏会缩放，所以不需要更小的版本。
 */
const WIDTH = 1920;

/**
 * 压缩质量。
 *
 * 78 是个经验值：在这个质量下，渐变和云层看不出块状瑕疵，
 * 而文件大小能压到原图的 5% 左右。
 * 调高会明显变大（85 大约是 78 的两倍体积），收益却很有限。
 */
const QUALITY = 78;

async function main() {
  const sourcePath = resolve(process.cwd(), SOURCE);
  const outputPath = resolve(process.cwd(), OUTPUT);

  if (!existsSync(sourcePath)) {
    console.error(`❌ 找不到原图：${SOURCE}`);
    console.error("");
    console.error("   这个文件不在仓库里（它是 6 MB 的本地素材）。");
    console.error("   想生成首屏背景图，需要先放一张图到这个位置。");
    process.exit(1);
  }

  const before = statSync(sourcePath).size;

  const outDir = dirname(outputPath);
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  const info = await sharp(sourcePath)
    .resize({ width: WIDTH, withoutEnlargement: true })
    /**
     * mozjpeg 是 sharp 内置的优化版 JPEG 编码器，
     * 同样质量下比默认编码器小 10~20%。
     */
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toFile(outputPath);

  const after = statSync(outputPath).size;

  const toMB = (n: number) => (n / 1024 / 1024).toFixed(2);
  const toKB = (n: number) => (n / 1024).toFixed(0);

  console.log("");
  console.log(`  原图    ${SOURCE}`);
  console.log(`         ${info.width ? "" : ""}${toMB(before)} MB`);
  console.log("");
  console.log(`  成品    ${OUTPUT}`);
  console.log(`         ${info.width}×${info.height}  ${toKB(after)} KB`);
  console.log("");
  console.log(
    `  体积减少 ${(100 - (after / before) * 100).toFixed(1)}%（${toMB(before)} MB → ${toKB(after)} KB）`
  );
  console.log("");
}

main().catch(error => {
  console.error("生成失败：", error.message);
  process.exit(1);
});
