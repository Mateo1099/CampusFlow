const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

async function generateIcons() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ deviceScaleFactor: 2 });
  const page = await context.newPage();

  const svgPath = path.resolve(__dirname, '../public/favicon.svg');
  const svgContent = fs.readFileSync(svgPath, 'utf8');

  // 1. Regular 192x192 icon (with rounded cyber-luxe dark background)
  const renderIconHtml = (size, paddingPercent = 15, isMaskable = false) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            width: ${size}px;
            height: ${size}px;
            background: #050811;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            ${isMaskable ? '' : 'border-radius: ' + (size * 0.22) + 'px;'}
          }
          .icon-container {
            width: ${size * (1 - (paddingPercent * 2 / 100))}px;
            height: ${size * (1 - (paddingPercent * 2 / 100))}px;
            display: flex;
            align-items: center;
            justify-content: center;
            filter: drop-shadow(0 0 ${size * 0.05}px rgba(134, 59, 255, 0.6));
          }
          svg {
            width: 100%;
            height: 100%;
          }
        </style>
      </head>
      <body>
        <div class="icon-container">
          ${svgContent}
        </div>
      </body>
    </html>
  `;

  // Targets to generate
  const targets = [
    { filename: 'pwa-192x192.png', size: 192, padding: 18, maskable: false },
    { filename: 'pwa-512x512.png', size: 512, padding: 18, maskable: false },
    { filename: 'pwa-maskable-512x512.png', size: 512, padding: 25, maskable: true },
    { filename: 'apple-touch-icon.png', size: 180, padding: 18, maskable: false },
  ];

  for (const target of targets) {
    await page.setViewportSize({ width: target.size, height: target.size });
    await page.setContent(renderIconHtml(target.size, target.padding, target.maskable), { waitUntil: 'load' });
    const outPath = path.resolve(__dirname, '../public', target.filename);
    await page.screenshot({ path: outPath, omitBackground: !target.maskable });
    console.log(`Generated ${target.filename} (${target.size}x${target.size})`);
  }

  await browser.close();
  console.log('All PWA icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
