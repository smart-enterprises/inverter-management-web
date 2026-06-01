import { chromium } from 'playwright';
const BASE = 'http://localhost:5173';
const CHROME = '/home/shahul/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';
const SHOTS = '/tmp/inverter-shots';

const pass = (m) => console.log(`  ✅ ${m}`);
const fail = (m) => console.error(`  ❌ ${m}`);
const info = (m) => console.log(`\n── ${m}`);

const browser = await chromium.launch({ headless: true, executablePath: CHROME });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

// Login
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
if (await page.$('input[type="email"]')) {
  await page.fill('input[type="email"]', 'superadmin123@gmail.com');
  await page.fill('input[type="password"]', 'superadmin@123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
}

// Go to orders list
info('Navigating to first order with a clickable eye icon');
await page.goto(`${BASE}/orders`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);

// Click the first eye/view icon
const eyeBtn = await page.$('svg[class*="eye"], button svg, [title*="view" i], [title*="detail" i]');
// Try clicking any button that might be "view" — use the first one at end of row
const allRowBtns = await page.$$('table tbody tr button, table tbody tr a');
let navigated = false;
for (const b of allRowBtns) {
  const bbox = await b.boundingBox();
  if (bbox && bbox.x > 1100) { // far right = view button
    await b.click();
    await page.waitForTimeout(3000);
    navigated = true;
    break;
  }
}
if (!navigated) {
  // Try clicking the row itself
  const firstRow = await page.$('table tbody tr');
  if (firstRow) { await firstRow.click(); await page.waitForTimeout(3000); navigated = true; }
}

await page.screenshot({ path: `${SHOTS}/a1-order-detail.png` });
info(`Current URL: ${page.url()}`);

// Find and click Add Items button
info('Looking for Add Items button');
let addItemsOpened = false;
for (const b of await page.$$('button')) {
  const t = (await b.textContent()).trim();
  if (/add.*item/i.test(t)) {
    await b.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SHOTS}/a2-add-items-open.png` });
    addItemsOpened = true;
    pass('Add Items modal opened');
    break;
  }
}

if (!addItemsOpened) {
  fail('Add Items button not found — checking page content');
  const content = await page.textContent('body');
  console.log('  Page snippet:', content.slice(0, 300));
  await browser.close();
  process.exit(1);
}

// ── QTY field: block letters ───────────────────────────────────────────────────
info('QTY field — blocking letters on PC');
const qtyField = await page.$('input[inputmode="numeric"]');
if (qtyField) {
  await qtyField.click({ clickCount: 3 });
  for (const k of ['a','b','c','e','E','+','-','.']) await qtyField.press(k);
  const v = await qtyField.inputValue();
  if (/^[0-9]*$/.test(v)) pass(`Blocked all non-digits → value: "${v}"`);
  else fail(`Letters got through → value: "${v}"`);
} else {
  fail('Qty input not found (brands may still be loading)');
}

// ── Submit without filling — validation ────────────────────────────────────────
info('Validation on empty submit');
const subBtn = await page.$('button:has-text("Add to order")');
if (subBtn) {
  const disabled = await subBtn.isDisabled();
  if (!disabled) {
    await subBtn.click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${SHOTS}/a3-validation.png` });
    const toast = await page.$('.swal2-popup, .swal2-container, .swal2-toast');
    const redBorder = await page.$('[class*="border-rose"], [class*="rose-300"]');
    const redText = await page.$('[class*="rose-500"]');
    if (toast) pass('SweetAlert toast appeared ✓');
    else fail('No toast appeared');
    if (redBorder || redText) pass('Red error styling visible ✓');
    else fail('No red error styling');
  } else {
    info('Submit disabled — dealer has no brands assigned, validation not testable automatically');
  }
}

// ── Select brand/model/product then test discount cap ─────────────────────────
info('Selecting product to test discount cap');
// Try selecting first brand
const brandSelects = await page.$$('button[class*="px-4"]'); // CustomSelect triggers
if (brandSelects.length > 0) {
  await brandSelects[0].click(); // open brand dropdown
  await page.waitForTimeout(500);
  const firstOption = await page.$('[class*="py-2.5"]:not([disabled])');
  if (firstOption) {
    await firstOption.click();
    await page.waitForTimeout(800);
    // Select model
    if (brandSelects.length > 1) {
      await brandSelects[1].click();
      await page.waitForTimeout(400);
      const modelOpt = await page.$('[class*="py-2.5"]:not([disabled])');
      if (modelOpt) {
        await modelOpt.click();
        await page.waitForTimeout(800);
        // Select product
        if (brandSelects.length > 2) {
          await brandSelects[2].click();
          await page.waitForTimeout(400);
          const prodOpt = await page.$('[class*="py-2.5"]:not([disabled])');
          if (prodOpt) {
            await prodOpt.click();
            await page.waitForTimeout(1000);
            await page.screenshot({ path: `${SHOTS}/a4-product-selected.png` });
            pass('Brand → Model → Product selected');

            // Switch to manual discount
            const manBtn = await page.$('button:has-text("Manual")');
            if (manBtn) {
              await manBtn.click();
              await page.waitForTimeout(400);
              const discF = await page.$('input[inputmode="decimal"]');
              if (discF) {
                // Test letter blocking
                await discF.click({ clickCount: 3 });
                for (const k of ['a','z','e','E']) await discF.press(k);
                const dv = await discF.inputValue();
                if (/^[0-9.]*$/.test(dv)) pass(`Discount blocked letters → "${dv}"`);
                else fail(`Discount accepted letters → "${dv}"`);

                // Test cap
                await discF.fill('999999');
                await page.keyboard.press('Tab');
                await page.waitForTimeout(400);
                const capped = await discF.inputValue();
                if (parseFloat(capped) < 999999) pass(`Discount capped → ${capped}`);
                else fail(`Discount NOT capped → ${capped}`);
                await page.screenshot({ path: `${SHOTS}/a5-discount-cap.png` });
              }
            }
          }
        }
      }
    }
  }
}

await browser.close();
console.log('\n── Done. Screenshots in /tmp/inverter-shots/a*.png');
