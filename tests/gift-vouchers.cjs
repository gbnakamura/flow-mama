// Isolated payment contract checks; never uses service credentials or the network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
function load(file, mocks, extra = '') {
  const module = { exports: {} };
  const names = [];
  const code = stripTypeScriptTypes(fs.readFileSync(file, 'utf8') + extra)
    .replace(/import \{([^}]+)\} from "([^"]+)";/g, 'const {$1} = require("$2");')
    .replace(/export (async function|function|const) (\w+)/g, (_, kind, name) => { names.push(name); return `${kind} ${name}`; })
    .replace(/export \{([^}]+)\};/g, (_, list) => { names.push(...list.split(',').map(x=>x.trim())); return ''; });
  vm.runInNewContext(code + `\nObject.assign(module.exports, {${names.join(',')}});`, { module, exports: module.exports, require: (name) => name in mocks ? mocks[name] : require(name), process: { env: { STRIPE_SECRET_KEY: 'test', APP_URL: 'https://example.com' } }, console: { error() {} } });
  return module.exports;
}
const gifts = load('lib/gift-vouchers.ts', {});
const reply = { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } };
(async () => {
  let saved, checkout, updated, expired = false, failAttach = false;
  const db = { from: () => ({
    insert: (value) => { saved = value; return { select: () => ({ single: async () => ({ data: { id: 'voucher-1' } }) }) }; },
    update: (value) => { updated = value; return { eq: () => ({ then: (resolve) => resolve({ error: failAttach ? {} : null }), eq: async () => ({}) }) }; },
  }) };
  const stripe = { checkout: { sessions: { create: async (value) => { checkout = value; return { id: 'cs_test', url: 'https://checkout.stripe.com/test' }; }, expire: async () => { expired = true; } } } };
  const api = load('app/api/gift-vouchers/checkout/route.ts', {
    'next/server': reply, '@/lib/gift-vouchers': gifts,
    '@/lib/supabase/admin': { createSupabaseAdmin: () => db, isSupabaseConfigured: () => true }, '@/lib/stripe': { getStripe: () => stripe },
  });
  const request = (body) => ({ json: async () => body });
  for (const [classes, price] of [[3,6000],[6,9600],[10,14000]]) {
    const result = await api.POST(request({ classes, recipientName: 'Test Recipient', recipientEmail: 'recipient@example.com', pricePence: 1 }));
    assert.equal(result.status, 200); assert.equal(saved.total_pence, price);
    assert.equal(checkout.line_items[0].price_data.unit_amount, price);
    assert.equal(checkout.line_items[0].quantity, 1);
    assert.equal(checkout.customer_email, undefined); // purchaser email must be collected separately
    assert.equal(checkout.metadata.gift_voucher_id, 'voucher-1');
    assert.equal(updated.stripe_checkout_session_id, 'cs_test');
  }
  for (const body of [null, {classes:4}, {classes:3,recipientName:' ',recipientEmail:'bad'}]) assert.equal((await api.POST(request(body))).status, 400);
  failAttach = true;
  assert.equal((await api.POST(request({classes:3,recipientName:'Test',recipientEmail:'test@example.com'}))).status, 503);
  assert.equal(expired, true);

  let voucher = { id:'voucher-1', total_pence:6000, status:'pending', stripe_checkout_session_id:'cs_test' }, writes = 0;
  const fulfilDb = { from: () => ({ select: () => ({ eq: () => ({ single: async () => ({data:voucher}) }) }), update: (value) => ({ eq: () => ({ in: async () => { writes++; voucher = {...voucher,...value}; return {}; } }) }) }) };
  const fulfil = load('app/api/webhooks/stripe/route.ts', {
    'next/server': reply, '@/lib/email': {}, '@/lib/stripe': { getStripe: () => ({ paymentIntents: { retrieve: async () => ({status:'succeeded',latest_charge:{amount_refunded:0}}) } }) }, '@/lib/supabase/admin': { createSupabaseAdmin: () => fulfilDb },
  }, '\nexport { fulfilGiftVoucher };').fulfilGiftVoucher;
  const session = {id:'cs_test',metadata:{gift_voucher_id:'voucher-1'},payment_intent:'pi_test',payment_status:'paid',currency:'gbp',amount_total:6000,customer_details:{email:'buyer@example.com'}};
  await assert.rejects(() => fulfil({...session,payment_status:'unpaid'}));
  await assert.rejects(() => fulfil({...session,amount_total:1}));
  assert.equal(writes,0);
  await fulfil(session); await fulfil(session);
  assert.equal(writes,1); assert.equal(voucher.status,'paid'); assert.equal(voucher.purchaser_email,'buyer@example.com');
  voucher.status = 'refunded'; await fulfil(session); assert.equal(writes,1);
  console.log('Gift voucher checks passed: fixed prices, invalid inputs, checkout failure, payment verification, retry safety and refunded status.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
