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

- A maintained repository changelog and a project rule requiring it to be updated with future pushes.
- A complete multi-date class booking and Stripe payment flow for Early Flow and Late Flow sessions.
- Capacity-controlled sessions, a 9pm booking cutoff, and automatic pricing of £22 for 1–5 classes, £16 for 6–9 classes, and £14 for 10 or more classes.
- Customer details collection for name, email, phone number, baby’s name, and baby’s age.
- A Supabase-backed admin area with overview, session management, customer history, revenue reporting, manual bookings, booking moves, removals, and cancellations.
- Password-based admin access for the approved Flow Mama administrator.
- Branded booking-confirmation emails sent through Resend, including booked dates and times, pricing, venue directions, preparation guidance, the health-screening form, and Amber’s sign-off.
- Plain-text fallbacks for transactional booking emails.
- Production and Preview integrations for Supabase, Stripe webhooks, and Resend.
- A dedicated Stripe sandbox webhook and stable Vercel branch preview for end-to-end test payments.

### Changed

- The booking page now explains pricing tiers before customers select their classes.
- The booking summary shows the customer’s saving once discounted pricing applies.
- The booking-page introduction is more compact while preserving the original navigation and logo sizing.
- The confirmation form no longer includes the separate postnatal-participation confirmation checkbox.
- The Terms and Conditions page now uses the supplied Flow Mama Terms & Conditions of Service.
- Manual admin bookings can be created without an email address.

### Fixed

- Corrected empty-state spacing above the booking-summary call to action.
- Allowed separate manual bookings for customers who share an email address.
- Added a clear selected state to the admin navigation.

## 2026-09-16 — Autumn term website

### Changed

- Updated the public website for the September 2026 term.
- Simplified the displayed class pricing.
