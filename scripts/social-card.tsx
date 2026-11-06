import React from 'react';
import { chromium } from 'playwright';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFile, writeFile } from 'node:fs/promises';
import { WheelScene, HamsterMark } from '../src/components/PixelArt';
// Optional asset authoring command. The generated PNG is committed, so normal builds need no browser.
const pixel = (await readFile('node_modules/@fontsource/pixelify-sans/files/pixelify-sans-latin-500-normal.woff2')).toString('base64');
const body = (await readFile('node_modules/@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff2')).toString('base64');
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head><style>
@font-face{font-family:Pixel;src:url(data:font/woff2;base64,${pixel})}@font-face{font-family:Body;src:url(data:font/woff2;base64,${body})}
*{box-sizing:border-box}body{margin:0;background:#f5f4ec;color:#283e31;font-family:Body,Arial}main{width:1200px;height:630px;padding:46px 56px;position:relative}.brand{display:flex;align-items:center;gap:13px;font-family:Pixel;font-size:32px}.brand svg{width:36px;height:36px}.main{display:grid;grid-template-columns:1.1fr 1fr;gap:30px;align-items:center;margin-top:26px}h1{font-family:Pixel;font-weight:500;font-size:76px;line-height:1;letter-spacing:-2px;margin:0 0 22px;max-width:550px}p{font-size:22px;line-height:1.5;margin:0;color:#616b5e}.scene{border-radius:16px;overflow:hidden;background:#e2e9cf}.scene svg{display:block;width:100%;height:auto}.tag{font-size:14px;position:absolute;right:58px;top:56px;color:#616b5e}.slots{display:flex;gap:8px;margin-top:26px}.slot{border:1px solid #244d36;border-radius:6px;background:#e2eacf;padding:10px 16px;font-size:22px}.footer{position:absolute;left:56px;right:56px;bottom:28px;border-top:1px solid #d5dacb;padding-top:18px;display:flex;justify-content:space-between;font-size:15px;color:#616b5e}
</style></head><body><main><div class="brand">${renderToStaticMarkup(<HamsterMark/>)} Squeek League.</div><span class="tag">A little league for a little legend.</span><div class="main"><div><h1>Know his<br>next move.</h1><p>One hamster. Pick his next 3 wheel hours.</p><div class="slots"><span class="slot">01</span><span class="slot">02</span><span class="slot">03</span><span style="font-size:16px;align-self:center;margin-left:6px">Your hours. Your call.</span></div></div><div class="scene">${renderToStaticMarkup(<WheelScene/>)}</div></div><div class="footer"><span>Community-built · Sepolia testnet · No money, no prizes</span><span>Not made by the Squeekchain team</span></div></main></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'public/social-card.png', type: 'png' });
  console.log('Created public/social-card.png (1200 × 630).');
} finally { await browser.close(); }
