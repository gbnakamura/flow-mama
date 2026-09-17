# Flow Mama Changelog

This file records meaningful changes to the Flow Mama website and booking system.

## How to update this file

- Add an entry under **Unreleased** before every push that changes the site, booking flow, admin tools, customer communications, integrations, or deployment configuration.
- Describe the outcome in plain language rather than listing implementation details.
- Group entries under **Added**, **Changed**, **Fixed**, or **Removed** as appropriate.
- When changes are released to the live website, move the relevant entries into a dated release section.
- Never include passwords, API keys, webhook secrets, or other private configuration values.

## Unreleased

### Added

- An Analytics tab in the admin navigation showing visitors, page views, popular pages, referral sources, device usage, paid bookings, and an estimated booking rate.
- A permanent session-delete action in the admin portal for unused test or accidental sessions, while protecting sessions with booking or checkout history.

### Changed

- Added privacy-conscious Vercel traffic collection while excluding admin, authentication, and booking-success pages.
- Updated site analytics with an interactive daily visitors and page-views graph inspired by the Vercel dashboard.
- Simplified the upcoming-sessions table by showing capacity within the booked total and removing the redundant spaces column.
- Updated the booking details form to refer to babies and toddlers inclusively.
- Replaced the baby or toddler numeric age field with separate years and months dropdowns.
- Replaced free-text session naming with consistent Early Flow, Late Flow, and Personal Training options when creating availability.
- Changed Personal Training bookings to close exactly 72 hours before each session and clarified the group confirmation and refund process.
- Added a live remaining-spots count to every Personal Training session that is available for group bookings.
- Removed the visible Personal Training cutoff reminder while continuing to enforce the 72-hour cutoff during booking.

## 2026-09-17 — Booking, payments and admin system

### Added

- A mobile booking bar that keeps the selected class count and live total visible while the main summary is off-screen, with one-tap navigation back to the summary.
- A show/hide password control on the admin sign-in form.
- An admin-only Email previews screen for sending clearly labelled Flow Mama and Personal Training confirmation tests without creating bookings, payments, scripts, or temporary API keys.
- Programme filters across the admin overview, customer directory, and revenue reporting, with separate Flow Mama and Personal Training totals, schedules, customers, payments, and weekly chart series.
- A complete Flow Mama favicon set for browser tabs, bookmarks, Apple devices, and installed shortcuts.
- A maintained repository changelog and a project rule requiring it to be updated with future pushes.
- A complete multi-date class booking and Stripe payment flow for Early Flow and Late Flow sessions.
- Capacity-controlled sessions, a 9pm booking cutoff, and automatic pricing of £22 for 1–5 classes, £16 for 6–9 classes, and £14 for 10 or more classes.
- Customer details collection for name, email, phone number, baby’s name, and baby’s age.
- A Supabase-backed admin area with overview, session management, customer history, revenue reporting, manual bookings, booking moves, removals, and cancellations.
- Password-based admin access for the approved Flow Mama administrator.
- Branded booking-confirmation emails sent through Resend, including booked dates and times, pricing, venue directions, preparation guidance, the health-screening form, and Amber’s sign-off.
- A simplified branded personal-training confirmation email listing each booked session, its price, and the total paid.
- Plain-text fallbacks for transactional booking emails.
- Production and Preview integrations for Supabase, Stripe webhooks, and Resend.
- A dedicated Stripe sandbox webhook and stable Vercel branch preview for end-to-end test payments.
- An existing-customer picker for manual admin bookings, so saved contact and baby details can be reused.
- A `/personal-training` checkout for £30 group sessions and £50 one-to-one sessions, with multi-date selection and adult contact details.
- Shared personal-training availability that can be published as Group + 1:1, Group only, or 1:1 only.
- Automatic personal-training slot locking: the first paid booking determines Group or 1:1 for dual-purpose times, preventing conflicting bookings.
- A single admin availability form with a One-off / Recurring switch, showing only the scheduling fields needed for the selected option.
- A secure admin password-reset page for Supabase recovery links.

### Changed

- Centred the Flow Mama logo in the mobile booking header and moved the back control to the conventional top-left position.
- Updated the Flow Mama session summary language from “booking” to “cart” so it is clearer that customers are building a multi-session purchase.
- Documented the required Stripe price settings for Group and 1:1 Personal Training deployments.
- Group and 1:1 personal-training price choices now have a clearer interactive hover state.
- The booking page now explains pricing tiers before customers select their classes.
- The booking summary shows the customer’s saving once discounted pricing applies.
- The booking-page introduction is more compact while preserving the original navigation and logo sizing.
- The confirmation form no longer includes the separate postnatal-participation confirmation checkbox.
- The Terms and Conditions page now uses the supplied Flow Mama Terms & Conditions of Service.
- Manual admin bookings can be created without an email address.
- The admin availability form now supports choosing a programme and controlling which personal-training booking types each new time allows.
- Personal-training customers can be added manually from the existing customer directory without baby details.

### Fixed

- Fixed imported Flow Mama bookings being incorrectly shown as sold out after Personal Training availability was introduced.
- Corrected empty-state spacing above the booking-summary call to action.
- Allowed separate manual bookings for customers who share an email address.
- Added a clear selected state to the admin navigation.

## 2026-09-16 — Autumn term website

### Changed

- Updated the public website for the September 2026 term.
- Simplified the displayed class pricing.
