# Restaurant POS (Chai & Co.)

Browser-based POS prototype for a 12-outlet quick-service café chain, designed for a lunch rush of ~120 bills/hour per outlet.

**Live link:** https://restaurantposprototype.vercel.app/

## Try it in 2 minutes
1. Open the live link. The Popular tab shows the best sellers. Tap three items; items with variants or add-ons open a choice popup (for example Masala Chai: Regular + Extra Ginger).
2. In the customer field at the top of the cart, type a phone number such as `9876543210` and press Enter (or tap Attach). Customers are optional and must be attached before settling.
3. UPI is the default mode. Tap Settle once. The cart panel switches to the settled summary (token, total, amount collected).
4. Tap "View bill & KOT" to see the 80mm bill and the separate KOT side by side. "Print bill + KOT" opens the browser print dialog.
5. Tap "New bill", type the same phone number (or just its last digits, like `3210`), select it, then tap "Repeat last order". The same lines come back, re-priced from the current menu.
6. Tap "Day summary" in the header to see today's reconciliation, payment modes, top items, customers and the bills table.

## Run locally
- Prerequisite: Node 24 (developed on v24.21.0)
- `npm install`
- `npm run dev` (http://localhost:5173)
- `npm test` (Vitest; 81 tests in 7 files, all passing at the time of writing)
- `npm run build` (type-check and production build)

## Features
- **Menu:** 31 items in 5 categories (Chai, Coffee, Coolers, Snacks, Bakery & Desserts) from menu.json. Items have variants (for example Cutting/Regular/Large) and add-on groups with a maximum selection. A "Popular" tab, first and selected by default, shows the 9 best sellers.
- **Fast billing:** one tap adds an item, tapping the same configuration again adds to the quantity, "−" at quantity 1 removes the line. Search works across all categories by name or short code (an exact code such as "MC" shows only that item) and Enter adds the top result. Touch targets are at least 48px. Shift+Enter settles.
- **Dine-in or Takeaway:** Takeaway is the default and is stored on the bill. Each bill gets a token that restarts daily.
- **Tax and discounts:** 5% GST split into 2.5% CGST and 2.5% SGST. Discount per item (tap the line) and per bill, each as percent or flat and capped at what it applies to. Round-off is shown as its own line.
- **Payments:** UPI, Card, Cash or Split (up to three modes). UPI and Card settle in one tap. Cash opens a modal with quick amounts and change due. A default mode (UPI at first) can be changed with "Make <mode> the default" and is remembered.
- **Bill and KOT:** one print job holds the bill, a page break, then the KOT (token, order type, bill number, time and items, no prices). Reprints are stamped DUPLICATE COPY on the bill.
- **Customers:** optional phone capture with search by the last digits; a returning customer shows their last 3 orders and a one-tap Repeat.
- **Day summary:** reconciliation, headline numbers, sales by payment mode, top 5 items, new vs repeat customers and a bills table, for any date.
- **Persistence:** bills, payments, customers, the daily counter, the default payment mode and the auto-print setting survive a refresh (see the limitation below for the cart).

## Measured billing time
App-measured, from the first cart line to Settle, on the deployed site. The time is stored with each bill and shown on the settle screen and the day summary.

| Scenario | Time | Runs |
|---|---|---|
| Simple manual bill | under 10 s | about 15 runs |
| Repeat order, 3 items, one tap, default payment | about 5 s | 15 |
| 3 items with several add-ons, single payment | about 15 s | 4 runs |
| 3 items with several add-ons, split payment (stress case) | about 20 s | 3 runs |

For repeat orders the timer starts when the order is added to the cart, so it does not include entering the customer's phone number, which takes about 3 seconds. The brief's target is a repeat order of 3 items in under 20 seconds. The stress case sits at the limit, and split payment plus modifiers is where the next speed-up would go.

## Assumptions
- The restaurant has a touch-based POS machine that also supports keyboard and mouse input. There is no mobile interface.
- The POS runs in a web browser, no installation needed.
- Data is stored in the browser (local storage), so one device = one outlet.
- Item prices are exclusive of GST. GST is 5%, split into 2.5% CGST and 2.5% SGST.
- Calculation order (src/lib/totals.ts): line total = (variant + add-ons) × quantity; then the item-level discount per line; then the bill-level discount on the remaining amount; then GST on the discounted amount. CGST and SGST are each computed on that amount and rounded separately to the nearest paise; the total is then rounded to the nearest rupee and the round-off is shown on its own line.
- Money is held as integer paise internally and shown as rupees. Percent discounts are rounded to the nearest paise.
- Rounding: the grand total is rounded to the nearest rupee, and half-rupee amounts round up (73.50 becomes 74.00, round-off +0.50). The totals tests depend on this.
- Payments are whole rupees. Bill totals are always whole rupees after round-off, and cash received and split amounts are entered as whole rupees.
- Split supports up to three modes (UPI, Card, Cash), at least two of them with an amount, and the amounts must add up exactly to the total.
- UPI and Card confirmation happens outside the POS (mocked): the cashier confirms the payment on the terminal or phone, then taps Settle once.
- Payment amounts exclude change. For cash, the payment record holds the part of the bill settled, plus cashReceived and changeDue separately.
- Zero-total bills (for example a 100% discount) save with no payment record.
- The cashier is fixed as "Cashier 1" (no login yet).
- Bill number = DDMMYY + the daily counter padded to 4 digits (30 Oct 2026, first bill: 3010260001). The counter is per local calendar day, restarts at 1 on a new day, and increments when a bill is settled (abandoned carts leave no gaps). Token = the counter wrapped to 1-999.
- A customer's ID is their normalised 10-digit phone number (a leading +91, 91 or 0 is stripped; it must start with 6-9). There are no customer names anywhere. A customer record is saved only when a bill is settled with them attached.
- Repeat order rebuilds the old order's lines (same variant, add-ons and quantity) and re-prices them from the current menu. Discounts are never carried over. Anything no longer on the menu is skipped, with a notice naming it.
- The day summary is computed from saved completed bills only and is never stored. Dates are local calendar dates (23:59 belongs to that day, 00:01 to the next). Item revenue is the line total after item-level discount; bill-level discounts are not allocated to items.
- Printing is browser-based (the browser print dialog) on 80mm paper. One print job holds the bill, a page break, then the KOT. The GSTIN and FSSAI numbers and the restaurant address on the bill are sample values.
- "Auto-print on settle" is a checkbox in the settled summary, off by default and remembered per browser. With it off, the cashier prints on demand from "Reprint" or "View bill & KOT".
- Any print after the first is stamped DUPLICATE COPY on the bill (not the KOT). Each print job is counted in the bill's printCount.

## Mock data
- menu.json in the repo root is the seed data. It is loaded on first run (when nothing is stored yet) and never overwrites stored data.

## What is mocked
- Storage is the browser's localStorage only. It is per browser and per device, lost when site data is cleared, and there is no backend. Tills do not share data.
- UPI QR and payment confirmation: the QR is labelled "Mock QR, no real payment" and encodes a upi:// link with the exact amount. Nothing checks that money arrived.
- Card machine: no integration; the cashier confirms the card payment outside the POS.
- Cashier identity: fixed as "Cashier 1". There is no login and there are no roles.
- Printers: printing uses the browser print dialog, not a thermal printer. A real deployment would print silently to a counter printer and a kitchen printer via a print agent or ESC/POS.
- GSTIN, FSSAI and restaurant address on the bill are sample values.

## Known limitations
- An unsettled cart is not saved. Refreshing the page loses it.
- There is no manager approval: any cashier can apply any discount and reprint any bill. There is no void feature at all.
- Completed bills cannot be edited or deleted in the UI. The only change made to a saved bill is its print count.
- Printing was only checked through Chrome's print pipeline (a PDF export of the bill and KOT), never on a real 80mm thermal printer. The `@page { size: 80mm auto }` rule is not valid CSS in Chrome, which ignores it, so a real printer's driver decides the paper size.
- localStorage is small (about 5 MB per origin), so a very long history of bills in one browser would eventually fill it.

## Tools used
- AI: Claude Code ($20 plan), running in the terminal
- GitHub for the code
- Vercel for deployment

## AI use notes
- Claude Code wrote most of the code and tests, working from requirements and prompts I wrote and reviewed. I checked its output by hand in the browser and against menu.json, and ran the tests, instead of taking its explanations on trust.
- Search: I asked why "CC" also showed Cappuccino. Claude said Cappuccino's code was also CC. That was wrong. I checked menu.json: Cappuccino is CP and only Cold Coffee is CC. It matched because "cappuccino" contains the letters "cc" in the name. Search now puts an exact short-code match first and shows only that item.
- Zero-total bills first showed 'Settle · UPI · ₹0'. I changed them to 'No payment due' with no payment record.
- After settle, the first version printed the bill only and the KOT was missing. I caught it in testing and Claude fixed it.
- I changed the original auto-print-on-every-settle design to an on-demand receipts view with an optional auto-print toggle, because two print dialogs per bill would slow the counter.
- Customer panel layout: typing a phone number showed the matches and last orders as a thin clipped sliver with the cart lines drawn over them. The cause was an absolutely positioned dropdown inside a scrolling container, which clipped it and reserved no height. Claude fixed it by putting the results in the normal flow and giving the customer block its own height cap and scrolling.

## What I would build next
- A server database with multi-outlet sync
- Offline-first tills with a retry queue
- An outlet code in bill numbers
- Manager approval for large discounts, voids and reprints
- Station-wise KOTs, and a KDS (kitchen display)
- Cash reconciliation and shift handover
- Saved draft bills
- Wallet and loyalty payment modes
- Tips
- Silent printing
- E-bill as an option

## Reset for demos
Clear the site's data in the browser; the menu is re-seeded on the next load and the bill counter restarts at 1.
- Chrome or Edge: open DevTools (F12), go to Application, then Storage, and click "Clear site data". Or click the icon at the left of the address bar, then Site settings, then "Delete data".
- Safari: Settings, Privacy, Manage Website Data, find the site and remove it.
- Firefox: click the icon at the left of the address bar, then "Clear cookies and site data".
