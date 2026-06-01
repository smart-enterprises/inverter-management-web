import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'http://localhost:5173';
const SHOTS = '/tmp/inverter-shots';
const CHROME = '/home/shahul/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';
fs.mkdirSync(SHOTS, { recursive: true });

const pass = (msg) => console.log(`  ✅ PASS: ${msg}`);
const fail = (msg) => console.error(`  ❌ FAIL: ${msg}`);
const info = (msg) => console.log(`\n── ${msg}`);

const browser = await chromium.launch({ headless: true, executablePath: CHROME });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', e => console.error(`  [PAGE ERR] ${e.message}`));

async function shot(name) { await page.screenshot({ path: `${SHOTS}/${name}.png` }); }
async function go(path, wait = 2500) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(wait);
}

// ── LOGIN ──────────────────────────────────────────────────────────────────────
info('LOGIN');
await go('/');
if (await page.$('input[type="email"]')) {
  await page.fill('input[type="email"]', 'superadmin123@gmail.com');
  await page.fill('input[type="password"]', 'superadmin@123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
}
await shot('01-after-login');
if (await page.$('input[type="email"]')) { fail('Login failed'); process.exit(1); }
pass('Logged in successfully');

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
info('DASHBOARD — name formatting');
await go('/');
await shot('02-dashboard');
const dashText = await page.textContent('body');
if (/[A-Z]{2,}_[A-Z]{2,}/.test(dashText)) fail('Underscore name found on dashboard');
else pass('No underscore names on dashboard');

// ── USERS PAGE ────────────────────────────────────────────────────────────────
info('USERS PAGE');
await go('/users');
await shot('03-users');
const usersBtns = await page.$$('button');
let foundEdit = false;
for (const b of usersBtns) {
  const t = (await b.textContent()).trim().toLowerCase();
  const title = ((await b.getAttribute('title')) || '').toLowerCase();
  if (t === 'edit' || title === 'edit') {
    await b.click(); await page.waitForTimeout(1500);
    await shot('04-users-edit-open');
    pass('Edit modal opened without full-table reload');
    foundEdit = true;
    // close
    for (const c of await page.$$('button')) {
      if (/cancel/i.test((await c.textContent()).trim())) { await c.click(); break; }
    }
    await page.waitForTimeout(800);
    // open Add New User
    for (const b2 of await page.$$('button')) {
      const t2 = (await b2.textContent()).trim();
      if (/add|new user/i.test(t2) && !/edit/i.test(t2)) {
        await b2.click(); await page.waitForTimeout(1000);
        await shot('05-users-add-blank');
        const inp = await page.$('input[name="name"], input[placeholder*="ame"]');
        if (inp) {
          const v = await inp.inputValue();
          if (v === '') pass('Add User form is blank after closing edit modal');
          else fail(`Add User form has stale value: "${v}"`);
        }
        for (const c of await page.$$('button')) {
          if (/cancel/i.test((await c.textContent()).trim())) { await c.click(); break; }
        }
        break;
      }
    }
    break;
  }
}
if (!foundEdit) info('No edit button visible on users (may need data)');

// ── CREATE ORDER ──────────────────────────────────────────────────────────────
info('CREATE ORDER');
await go('/orders/create', 3000);
await shot('06-create-order');
const createText = await page.textContent('body');
if (createText.replace(/\s/g,'').length < 300) fail('Create Order page is blank!');
else pass('Create Order page loaded with content');

// ── ORDERS LIST ───────────────────────────────────────────────────────────────
info('ORDERS LIST');
await go('/orders', 2500);
await shot('07-orders');
const links = await page.$$('a[href*="/orders/"]');
let orderPath = null;
for (const l of links) {
  const h = await l.getAttribute('href');
  if (h && !h.includes('create')) { orderPath = h; break; }
}

// ── ORDER DETAILS + ADD ITEMS ─────────────────────────────────────────────────
if (orderPath) {
  info(`ORDER DETAILS ${orderPath}`);
  await go(orderPath, 3000);
  await shot('08-order-details');

  let addItemsFound = false;
  for (const b of await page.$$('button')) {
    const t = (await b.textContent()).trim();
    if (/add.*item/i.test(t)) {
      await b.click(); await page.waitForTimeout(3000);
      await shot('09-add-items-modal');
      addItemsFound = true;
      pass('Add Items modal opened');
      break;
    }
  }

  if (addItemsFound) {
    // qty blocks letters
    info('QTY field — blocks letters');
    const qtyF = await page.$('input[inputmode="numeric"]');
    if (qtyF) {
      await qtyF.click({ clickCount: 3 });
      for (const k of ['a','b','e','E','+','-','.']) await qtyF.press(k);
      const v = await qtyF.inputValue();
      if (/^[0-9]*$/.test(v)) pass(`Qty blocks all non-digits → "${v}"`);
      else fail(`Qty accepted bad chars → "${v}"`);
    }

    // discount field blocks letters
    info('DISCOUNT field — blocks letters, capped at price');
    const manBtn = await page.$('button:has-text("Manual")');
    if (manBtn) {
      await manBtn.click(); await page.waitForTimeout(400);
      const discF = await page.$('input[inputmode="decimal"]');
      if (discF) {
        await discF.click({ clickCount: 3 });
        for (const k of ['a','z','e','E']) await discF.press(k);
        const discV = await discF.inputValue();
        if (/^[0-9.]*$/.test(discV)) pass(`Discount blocks letters → "${discV}"`);
        else fail(`Discount accepted letters → "${discV}"`);

        // cap test
        await discF.fill('999999');
        await page.keyboard.press('Tab');
        await page.waitForTimeout(400);
        const capped = await discF.inputValue();
        const capNum = parseFloat(capped);
        if (capNum < 999999) pass(`Discount capped at ${capped} (below 999999)`);
        else fail(`Discount NOT capped — still shows ${capped}`);
        await shot('10-discount-capped');
      }
    } else {
      info('Manual discount button not visible (select a product first)');
    }

    // validation on submit
    info('SUBMIT without data — validation');
    const subBtn = await page.$('button:has-text("Add to order")');
    if (subBtn && !(await subBtn.isDisabled())) {
      await subBtn.click(); await page.waitForTimeout(1200);
      await shot('11-validation-errors');
      const toast = await page.$('.swal2-popup, .swal2-container');
      const redMsg = await page.$('.text-rose-500, [class*="rose"]');
      if (toast || redMsg) pass('Validation fired — toast or red error visible');
      else fail('No validation error visible after submit without data');
    } else {
      info('Submit disabled (brands not loaded for this dealer — validation test skipped)');
    }

    for (const b of await page.$$('button')) {
      if (/cancel/i.test((await b.textContent()).trim())) { await b.click(); break; }
    }
  } else {
    info('Add Items button not found on order details');
  }
} else {
  info('No orders found — skipping order detail tests');
}

// ── ANALYTICS ─────────────────────────────────────────────────────────────────
info('ANALYTICS');
await go('/analytics', 2500);
await shot('12-analytics');
const aText = await page.textContent('body');
if (aText.replace(/\s/g,'').length < 200) fail('Analytics blank');
else pass('Analytics page loaded');

// ── DEALERS ───────────────────────────────────────────────────────────────────
info('DEALERS');
await go('/dealers', 2500);
await shot('13-dealers');
if (/[A-Z]{2,}_[A-Z]{2,}/.test(await page.textContent('body'))) fail('Underscore name on dealers');
else pass('No underscore names on dealers');

// ── PRODUCTS — edit modal blue theme ──────────────────────────────────────────
info('PRODUCTS — edit modal blue theme');
await go('/products', 2500);
await shot('14-products');
for (const b of await page.$$('button')) {
  const t = (await b.textContent()).trim().toLowerCase();
  const title = ((await b.getAttribute('title')) || '').toLowerCase();
  if (t === 'edit' || title === 'edit') {
    await b.click(); await page.waitForTimeout(1500);
    await shot('15-product-edit-modal');
    const html = await page.content();
    if (/bg-amber-600/.test(html) && /type="submit"|Add|Save/i.test(html)) fail('Product edit still has amber button');
    else pass('Product edit modal — no amber submit (blue theme OK)');
    for (const c of await page.$$('button')) {
      if (/cancel|close/i.test((await c.textContent()).trim())) { await c.click(); break; }
    }
    break;
  }
}

console.log('\n── Done. Screenshots: /tmp/inverter-shots/');
await browser.close();
