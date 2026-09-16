# Flow Mama Stripe Setup Guide

This guide sets up the Stripe product used by the Flow Mama booking system.

The booking system uses:

- One Stripe product for all Flow Mama classes.
- Three one-time prices under one product, selected automatically from the number of sessions.
- Stripe-hosted Checkout.
- Card authorization followed by capture only after every selected session has been successfully allocated.

Early Flow and Late Flow do not need separate Stripe products. Customers choose those session times on the Flow Mama booking page.

## Pricing to configure

| Number of classes | Price per class |
| ---: | ---: |
| 1–5 | £22.00 |
| 6–9 | £16.00 |
| 10 or more | £14.00 |

Stripe's current Dashboard does not expose one-off volume pricing in this sandbox's product form. The equivalent configuration is three one-time flat prices on the same product, each with a stable lookup key. The application selects the correct price from the total class quantity and applies it to every class.

Examples:

- 5 classes cost 5 × £22 = £110.
- 6 classes cost 6 × £16 = £96.
- 10 classes cost 10 × £14 = £140.
- 11 classes cost 11 × £14 = £154.

The fact that 6 classes cost less than 5 classes follows the agreed pricing structure.

## 1. Start in a Stripe sandbox

Create and test the product in a Stripe sandbox before configuring live payments.

1. Sign in to the Stripe Dashboard.
2. Select a sandbox, or switch on test mode if your Dashboard still uses the test-mode interface.
3. Confirm that the Dashboard clearly indicates that you are not in live mode.
4. Open **More → Product catalogue**.
5. Select **Add product** or **Create product**.

Do not begin with the live product. The booking and payment flow should be tested completely first.

## 2. Create the Flow Mama product

Use the following details:

- **Name:** `Flow Mama Classes`
- **Description:** `Mother and baby movement and social sessions at Northfields Community Centre`
- **Image:** Optional. The Flow Mama logo can be added later.

Only one Flow Mama product is required. Do not create separate products for Early Flow, Late Flow, individual dates, or individual terms.

## 3. Add the three one-time prices

Create these prices under **Flow Mama Classes**:

| Quantity band | Flat price per class | Lookup key |
| --- | ---: | --- |
| 1–5 | £22.00 | `flow_mama_1_5` |
| 6–9 | £16.00 | `flow_mama_6_9` |
| 10+ | £14.00 | `flow_mama_10_plus` |

For each price, choose **One-off**, **Flat rate**, and **GBP**. The lookup keys are essential: the checkout uses them to choose the correct price without hard-coding a Price ID. Do not choose Package pricing, which rounds quantities into fixed bundles.

## 4. Leave tax collection off unless required

Unless Flow Mama is VAT-registered and has received appropriate accounting advice:

- Do not enable Stripe Tax.
- Do not attach a tax rate.
- Leave automatic tax collection off.

If Flow Mama is VAT-registered, review this section with an accountant before accepting live payments.

## 5. Save the product and confirm its default price

1. Save the product.
2. Reopen **Flow Mama Classes** in the Product catalogue.
3. Confirm that all three active one-time prices and their lookup keys are shown. The £22 price can remain the default.
4. Copy the Product ID beginning with `prod_`.
5. Also note the test Price ID beginning with `price_` for troubleshooting.

The booking application is configured with the stable `prod_` Product ID. At checkout, it retrieves the active price carrying the lookup key for the selected quantity band.

The Product ID is safe to share with the developer. Never send a Stripe secret key by email, chat, or in a document committed to Git.

## 6. Configure payment methods

Open **Settings → Payment methods** in the Stripe Dashboard.

For the first release:

- Enable cards.
- Enable Link.
- Allow Apple Pay and Google Pay through card payments.
- Leave delayed bank-payment methods disabled.
- Do not enable promotion codes.

The booking system separates card authorization from capture. It authorizes the customer's card first, allocates every selected class atomically, and only then captures the payment. Delayed payment methods do not fit this flow and should remain disabled initially.

Stripe-hosted Checkout handles Apple Pay and Google Pay automatically when they are supported by the customer's device, browser, card, and Stripe configuration.

## 7. Configure business and receipt details

Review the customer-facing information in the Stripe Dashboard:

- Business name: `Flow Mama`
- Support email: `amber@flowmamanorthfields.com`
- Website and business address
- Statement descriptor
- Brand logo and colour, if desired

In Stripe's customer-email settings, enable receipts for successful payments.

Customers will receive two different emails:

1. A Stripe payment receipt.
2. A Flow Mama confirmation sent through Resend that lists every booked date.

## 8. Information needed by the application

Once the sandbox product has been created, record:

- Sandbox Product ID: `prod_VGvVx9m9Qge3Er`
- Sandbox Price IDs: three `price_...` values

The Price IDs are useful for verification, but the application follows the lookup keys so future price changes do not require a redeployment.

Stripe API keys and webhook signing secrets will later be added directly to the appropriate local and Vercel environment-variable settings. They must never be committed to the repository.

Expected environment-variable names will be documented in `.env.example` during implementation.

## 9. Test-mode checks

Before creating the live configuration, the completed booking system should test all of the following in Stripe's sandbox:

- 1 class charges £22.
- 5 classes charge £110.
- 6 classes charge £96.
- 9 classes charge £144.
- 10 classes charge £140.
- 11 classes charge £154.
- One purchase can mix Early Flow and Late Flow dates.
- One customer can select both sessions on the same date.
- A successful authorization is captured only after every place is allocated.
- If the last place has just been taken, the authorization is cancelled and no payment is captured.
- Duplicate Stripe webhook delivery does not duplicate an order or booking.
- The Stripe receipt and Flow Mama confirmation email are both delivered.
- A manually issued full or partial refund is reflected in the admin dashboard.

## 10. Create or copy the live product

Do this only after the sandbox booking flow passes its tests.

1. Open the sandbox **Flow Mama Classes** product.
2. Use **Copy to live mode** if that option is available.
3. If it is not available, switch to live mode and repeat sections 2–7 exactly.
4. Open the live product.
5. Confirm its three GBP one-time prices and lookup keys.
6. Confirm that the £22 price is the live product's default Price.
7. Record the live Product ID beginning with `prod_`.
8. Record the live default Price ID beginning with `price_` for verification.

Test-mode and live-mode objects have different IDs. Make sure the production environment receives the live Product ID, not the sandbox Product ID.

## 11. Changing prices later

Keep using the same **Flow Mama Classes** Product. Do not create another product simply because the prices change.

To change the tiers:

1. Open **Flow Mama Classes** in the Stripe Product catalogue.
2. Select **Add another price**.
3. Create the replacement one-time GBP flat Price.
4. Transfer the corresponding lookup key (`flow_mama_1_5`, `flow_mama_6_9`, or `flow_mama_10_plus`) to the replacement Price.
5. Verify that a test checkout uses the new amount.
6. Archive the old Price after the replacement is working.

Stripe Price amounts are immutable once created. Changing pricing therefore creates a new `price_...` object under the same stable `prod_...` Product. The booking system follows the lookup keys, so transferring the relevant key does not require a code change or redeployment.

Past orders retain the Price ID, quantity, unit price, and total that were used when the customer paid.

## 12. Do not configure these yet

The following will be created or connected during application implementation:

- Stripe Checkout Session creation
- Manual capture configuration
- Checkout success and cancellation URLs
- Stripe webhook endpoint
- Webhook event subscriptions
- Stripe webhook signing secret
- Vercel environment variables
- Supabase order and booking records
- Resend booking-confirmation emails

Do not create ad-hoc Payment Links for this system. The application must create Checkout Sessions dynamically because every order contains a customer-selected set of dates and requires a final atomic capacity check before payment capture.

## Completion checklist

- [x] Sandbox product created (`prod_VGvVx9m9Qge3Er`)
- [x] Three one-time GBP flat prices created
- [x] Prices are 1–5 at £22, 6–9 at £16, and 10+ at £14
- [x] Lookup keys match this guide exactly
- [x] £22 Price set as the Product's default
- [x] Sandbox Product ID recorded
- [ ] Cards and Link enabled
- [ ] Delayed payment methods disabled
- [ ] Successful-payment receipts enabled
- [ ] Business and support details reviewed
- [ ] Sandbox booking tests completed
- [ ] Live product created or copied after testing
- [ ] Live Product ID recorded
- [ ] No secret keys stored in this file or committed to Git
