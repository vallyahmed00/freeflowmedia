/**
 * Website Demo Recorder
 *
 * Records a desktop scroll + mobile scroll demo of any URL.
 * Outputs two MP4 files ready to upload as a Reel or TikTok.
 *
 * Usage:
 *   node record-demo.js https://example.com
 *   node record-demo.js https://example.com --name "Client Site Launch"
 *   node record-demo.js https://example.com --desktop-only
 *   node record-demo.js https://example.com --mobile-only
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const url = args.find(a => a.startsWith('http'));
const nameArg = args.indexOf('--name');
const label = nameArg !== -1 ? args[nameArg + 1] : new URL(url || 'https://example.com').hostname;
const desktopOnly = args.includes('--desktop-only');
const mobileOnly = args.includes('--mobile-only');

if (!url) {
  console.error('Usage: node record-demo.js <url> [--name "Label"] [--desktop-only] [--mobile-only]');
  process.exit(1);
}

const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const slug = label.replace(/[^a-z0-9]/gi, '-').toLowerCase();
const timestamp = new Date().toISOString().split('T')[0];

async function scrollPage(page, speed = 80) {
  await page.evaluate(async (scrollSpeed) => {
    await new Promise((resolve) => {
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      let current = 0;
      // Pause at top for 1.5s
      setTimeout(() => {
        const timer = setInterval(() => {
          current = Math.min(current + scrollSpeed, maxScroll);
          window.scrollTo({ top: current, behavior: 'smooth' });
          if (current >= maxScroll) {
            clearInterval(timer);
            // Pause at bottom for 1.5s then resolve
            setTimeout(resolve, 1500);
          }
        }, 100);
      }, 1500);
    });
  }, speed);
}

async function recordDesktop() {
  const videoDir = path.join(outputDir, 'desktop-raw');
  fs.mkdirSync(videoDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: videoDir, size: { width: 1280, height: 720 } },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();
  console.log(`📺  Desktop: loading ${url}...`);
  await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  // Extra wait for JS-heavy SPAs to render
  await page.waitForTimeout(2500);

  console.log(`📺  Desktop: scrolling...`);
  await scrollPage(page, 60);

  await page.waitForTimeout(500);
  const videoPath = await page.video()?.path();
  await context.close();
  await browser.close();

  const dest = path.join(outputDir, `${slug}-${timestamp}-desktop.webm`);
  if (videoPath) fs.renameSync(videoPath, dest);
  console.log(`✅  Desktop saved: ${dest}`);
  return dest;
}

async function recordMobile() {
  const videoDir = path.join(outputDir, 'mobile-raw');
  fs.mkdirSync(videoDir, { recursive: true });

  // iPhone 14 Pro dimensions — portrait, 9:19.5 — good for Reels
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    recordVideo: { dir: videoDir, size: { width: 393, height: 852 } },
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();
  console.log(`📱  Mobile: loading ${url}...`);
  await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(2500);

  console.log(`📱  Mobile: scrolling...`);
  await scrollPage(page, 40);

  await page.waitForTimeout(500);
  const videoPath = await page.video()?.path();
  await context.close();
  await browser.close();

  const dest = path.join(outputDir, `${slug}-${timestamp}-mobile.webm`);
  if (videoPath) fs.renameSync(videoPath, dest);
  console.log(`✅  Mobile saved: ${dest}`);
  return dest;
}

async function main() {
  console.log(`\n🎬  Recording demo for: ${url}\n`);

  const recordings = [];

  if (!mobileOnly) recordings.push(await recordDesktop());
  if (!desktopOnly) recordings.push(await recordMobile());

  console.log(`\n🎉  Done! ${recordings.length} video(s) saved to tools/website-demo/output/`);
  console.log(`\nFiles:`);
  recordings.forEach(f => console.log(`  → ${path.basename(f)}`));
  console.log(`\nNote: Files are .webm format. Open in any browser or convert with ffmpeg:`);
  console.log(`  ffmpeg -i output/<file>.webm output/<file>.mp4\n`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
