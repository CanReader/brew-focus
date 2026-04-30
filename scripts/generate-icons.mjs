import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const iconsDir = join(rootDir, 'src-tauri', 'icons');

const svgPath = join(rootDir, 'logo.svg');
const svgBuffer = readFileSync(svgPath);

// Tauri (specifically `tauri-utils` / `tauri-icon` codegen) refuses any PNG
// that isn't RGBA — the build fails with "icon ... is not RGBA". Sharp drops
// the alpha channel for opaque SVG content unless we explicitly call
// `.ensureAlpha()`. Apply it on every pipeline so generated icons are always
// 4-channel.
const sizes = [16, 32, 48, 64, 128, 256, 512, 1024];

const toRgba = (buf) =>
  sharp(buf).ensureAlpha().png({ compressionLevel: 9 });

async function generateIcons() {
  console.log('Generating icons from logo.svg...');

  // Generate PNG files at various sizes
  for (const size of sizes) {
    const outputPath = join(iconsDir, `${size}x${size}.png`);
    await toRgba(svgBuffer).resize(size, size).toFile(outputPath);
    console.log(`  Created ${size}x${size}.png`);
  }

  // Create 128x128@2x (256x256)
  await toRgba(svgBuffer).resize(256, 256).toFile(join(iconsDir, '128x128@2x.png'));
  console.log('  Created 128x128@2x.png');

  // Generate ICO file (Windows) using multiple sizes
  const icoSizes = [16, 32, 48, 256];
  const pngBuffers = await Promise.all(
    icoSizes.map((size) => toRgba(svgBuffer).resize(size, size).toBuffer()),
  );

  const icoBuffer = await pngToIco(pngBuffers);
  writeFileSync(join(iconsDir, 'icon.ico'), icoBuffer);
  console.log('  Created icon.ico');

  // For macOS ICNS, we use the 512x512 PNG as a base.
  // Note: proper ICNS generation requires additional tooling on macOS.
  await toRgba(svgBuffer).resize(512, 512).toFile(join(iconsDir, 'icon.png'));
  console.log('  Created icon.png (use for ICNS generation on macOS)');

  console.log('\nDone! Icons generated in src-tauri/icons/');
}

generateIcons().catch(console.error);
