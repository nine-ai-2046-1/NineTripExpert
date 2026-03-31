/**
 * flight_planner.js
 * Scrapes Booking.com for cheapest direct flights per segment.
 * Usage: node flight_planner.js --segments '[{"from":"CGK","to":"TPE","date":"2026-06-10"}]'
 */

import pkg from '/app/node_modules/playwright-core/index.js';
const { chromium } = pkg;

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };
  const segments = JSON.parse(get('--segments') || '[]');
  const currency = get('--currency') || 'HKD';
  const directOnly = args.includes('--direct');
  return { segments, currency, directOnly };
}

async function scrapeSegment(page, seg, currency, directOnly) {
  const directParam = directOnly ? '&stops=0' : '';
  const url = `https://www.booking.com/flights/search.html?type=ONEWAY&from=${seg.from}&to=${seg.to}&depart=${seg.date}&adults=1&cabinClass=ECONOMY&currency=${currency}${directParam}`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForTimeout(4000);

  return await page.evaluate((directOnly) => {
    const lines = document.body.innerText.split('\n').map(l => l.trim()).filter(l => l);
    const flights = [];
    for (let i = 0; i < lines.length; i++) {
      const isDirect = lines[i] === 'Direct';
      const isStop = !directOnly && lines[i]?.match(/^\d+ stop/);
      if (isDirect || isStop) {
        const depart = lines[i - 2];
        const arrive = lines[i + 2];
        const duration = lines[i + 1];
        const airline = lines[i + 4];
        const priceRaw = [lines[i + 5], lines[i + 6], lines[i + 7]].find(l => l?.match(/[A-Z]{2,3}\$?[\d,]+/));
        if (depart?.match(/^\d{2}:\d{2}$/) && arrive?.match(/^\d{2}:\d{2}$/)) {
          flights.push({ depart, arrive, duration, airline, price: priceRaw, direct: isDirect });
        }
      }
    }
    return flights[0] || null;
  }, directOnly);
}

async function main() {
  const { segments, currency, directOnly } = parseArgs();

  if (!segments.length) {
    console.log(JSON.stringify({ error: true, message: 'No segments provided. Use --segments \'[{"from":"CGK","to":"TPE","date":"2026-06-10"}]\'' }));
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
  });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });
  await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });
  const page = await ctx.newPage();

  const results = [];
  for (const seg of segments) {
    try {
      const flight = await scrapeSegment(page, seg, currency, directOnly);
      results.push({ ...seg, ...flight, error: false });
    } catch (e) {
      results.push({ ...seg, error: true, message: e.message });
    }
  }

  await browser.close();

  // 格式化輸出
  const lines = [];
  lines.push('| 段 | 航班 | 路線 | 出發 → 抵達 | 飛行時間 | 最低價 |');
  lines.push('|----|------|------|------------|---------|--------|');
  results.forEach((r, i) => {
    const type = r.direct ? '直飛' : (r.duration ? '經停' : 'N/A');
    lines.push(`| ${i + 1} | ${r.airline || 'N/A'} | ${r.from} → ${r.to} | ${r.depart || 'N/A'} → ${r.arrive || 'N/A'} | ${r.duration || 'N/A'} ${type} | ${r.price || 'N/A'} |`);
  });

  console.log(lines.join('\n'));
  console.log(JSON.stringify({ success: true, results }, null, 0));
}

main().catch(e => console.log(JSON.stringify({ error: true, message: e.message })));
