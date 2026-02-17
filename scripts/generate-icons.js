import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// FIT2FLY brand colors
const bgColor = '#0a0a0a';
const accentColor = '#e63946';

// Create SVG icon with FIT2FLY branding
function createIconSVG(size) {
  const fontSize = Math.floor(size * 0.35);
  const smallFontSize = Math.floor(size * 0.15);

  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${bgColor}"/>
      <rect x="${size * 0.1}" y="${size * 0.1}" width="${size * 0.8}" height="${size * 0.8}" rx="${size * 0.1}" fill="${bgColor}" stroke="${accentColor}" stroke-width="${size * 0.03}"/>
      <text x="50%" y="45%" font-family="Arial Black, Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">FIT</text>
      <text x="50%" y="70%" font-family="Arial Black, Arial, sans-serif" font-size="${fontSize}" font-weight="bold" text-anchor="middle" dominant-baseline="middle">
        <tspan fill="${accentColor}">2</tspan><tspan fill="white">FLY</tspan>
      </text>
    </svg>
  `;
}

async function generateIcons() {
  const publicDir = new URL('../public', import.meta.url).pathname;

  // Ensure public directory exists
  await mkdir(publicDir, { recursive: true });

  const sizes = [192, 512];

  for (const size of sizes) {
    const svg = createIconSVG(size);
    const buffer = Buffer.from(svg);

    await sharp(buffer)
      .png()
      .toFile(`${publicDir}/pwa-${size}x${size}.png`);

    console.log(`Created pwa-${size}x${size}.png`);
  }

  // Create apple touch icon (180x180)
  const appleSvg = createIconSVG(180);
  await sharp(Buffer.from(appleSvg))
    .png()
    .toFile(`${publicDir}/apple-touch-icon.png`);
  console.log('Created apple-touch-icon.png');

  // Create favicon (32x32)
  const faviconSvg = createIconSVG(32);
  await sharp(Buffer.from(faviconSvg))
    .png()
    .toFile(`${publicDir}/favicon.ico`);
  console.log('Created favicon.ico');

  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
