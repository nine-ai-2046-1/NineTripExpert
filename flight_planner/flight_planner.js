/**
 * flight_planner.js
 * Scrapes Booking.com for flights per segment.
 * Usage: node flight_planner.js --segments '[{"from":"CGK","to":"TPE","date":"2026-06-10"}]'
 * Options: --currency HKD --airline "Eva Airways" --no-direct
 */

import pkg from '/app/node_modules/playwright-core/index.js';
const { chromium } = pkg;

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };
  return {
    segments: JSON.parse(get('--segments') || '[]'),
    currency: get('--currency') || 'HKD',
    airline: get('--airline') || 'Cathay Pacific',
    directOnly: !args.includes('--no-direct'),
  };
}

async function scrapeSegment(page, seg, directOnly, preferAirline) {
  const directParam = directOnly ? '&stops=0' : '';
  const url = `https://www.booking.com/flights/search.html?type=ONEWAY&from=${seg.from}&to=${seg.to}&depart=${seg.date}&adults=1&cabinClass=ECONOMY${directParam}`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForTimeout(4000);
  await page.waitForLoadState('domcontentloaded');

  const flights = await page.evaluate(({ directOnly, preferAirline }) => {
    const lines = document.body.innerText.split('\n').map(l => l.trim()).filter(l => l);
    const results = [];
    for (let i = 0; i < lines.length; i++) {
      const isDirect = lines[i] === 'Direct';
      const isStop = !directOnly && lines[i]?.match(/^\d+ stop/);
      if (isDirect || isStop) {
        const depart = lines[i - 2];
        const arrive = lines[i + 2];
        const duration = lines[i + 1];
        const airline = lines[i + 4];
        const priceRaw = [lines[i + 5], lines[i + 6], lines[i + 7], lines[i + 8]].find(l => l?.match(/^[A-Z]{2,3}\$?[\d,]+$/));
        if (depart?.match(/^\d{2}:\d{2}$/) && arrive?.match(/^\d{2}:\d{2}$/)) {
          results.push({ depart, arrive, duration, airline, price: priceRaw, direct: isDirect });
        }
      }
    }
    const preferred = results.find(f => f.airline?.toLowerCase().includes(preferAirline.toLowerCase()));
    return preferred || results[0] || null;
  }, { directOnly, preferAirline });

  // 修正：抓唔到時返回清晰 error
  if (!flights || !flights.depart) {
    return { error: true, message: 'Unable to parse flight data from Booking.com' };
  }
  return { ...flights, error: false };
}

async function main() {
  const { segments, currency, airline, directOnly } = parseArgs();

  if (!segments.length) {
    console.log(JSON.stringify({ error: true, message: 'No segments provided.' }));
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
      const flight = await scrapeSegment(page, seg, directOnly, airline);
      results.push({ ...seg, ...flight });
    } catch (e) {
      results.push({ ...seg, error: true, message: e.message });
    }
  }

  await browser.close();

  const tableLines = [
    '| 段 | 航班 | 路線 | 出發 → 抵達 | 飛行時間 | 價格參考 |',
    '|----|------|------|------------|---------|---------|',
  ];
  results.forEach((r, i) => {
    const type = r.direct ? '直飛' : (r.duration ? '經停' : '-');
    const price = r.error ? `ERROR: ${r.message}` : (r.price || 'N/A');
    tableLines.push(`| ${i + 1} | ${r.airline || '-'} | ${r.from} → ${r.to} | ${r.depart || '-'} → ${r.arrive || '-'} | ${r.duration || '-'} ${type} | ${price} |`);
  });
  tableLines.push('');
  tableLines.push('> ⚠️ 價格以 Booking.com 網站顯示貨幣為準，僅供參考');

  console.log(tableLines.join('\n'));
  console.log(JSON.stringify({ success: true, currency_note: 'Price shown in Booking.com display currency, not guaranteed to match --currency param', results }, null, 0));
}

main().catch(e => console.log(JSON.stringify({ error: true, message: e.message })));
