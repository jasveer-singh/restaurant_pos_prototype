# Restaurant POS (Chai & Co.)

Browser-based POS prototype for a 12-outlet quick-service café chain, designed for a lunch rush of ~120 bills/hour per outlet.

**Live link:** https://restaurantposprototype.vercel.app/

## Run locally
- Prerequisite: Node 24 (developed on v24.21.0)
- npm install
- npm run dev

## Assumptions
- The restaurant has a touch-based POS machine that also supports keyboard and mouse input. There is no mobile interface.
- The POS runs in a web browser, no installation needed.
- Data is stored in the browser (local storage), so one device = one outlet.
- Item prices are exclusive of GST. GST is 5%, split into 2.5% CGST and 2.5% SGST.
- Rounding: the grand total is rounded to the nearest rupee, and half-rupee amounts round up (73.50 becomes 74.00, round-off +0.50). The totals tests depend on this.
- Payments are whole rupees. Bill totals are always whole rupees after round-off, and cash received and split amounts are entered as whole rupees.
- Split supports up to three modes (UPI, Card, Cash), at least two of them with an amount, and the amounts must add up exactly to the total.
- UPI and Card confirmation happens outside the POS (mocked): the cashier confirms the payment on the terminal or phone, then taps Settle once.
- Payment amounts exclude change. For cash, the payment record holds the part of the bill settled, plus cashReceived and changeDue separately.
- Zero-total bills (for example a 100% discount) save with no payment record.
- The cashier is fixed as "Cashier 1" (no login yet).
- Bill number = DDMMYY + the daily counter padded to 4 digits (30 Oct 2026, first bill: 3010260001). The counter is per local calendar day and increments when a bill is settled. Token = the counter wrapped to 1-999.
- To reset test data, clear site data in the browser.

## Mock data
- menu.json in the restaurant_pos folder is the seed data. Load it on first run.

## What is mocked
- UPI QR and payment confirmation: the QR is labelled "Mock QR, no real payment" and encodes a upi:// link with the exact amount. Nothing checks that money arrived.
- Card machine: no integration; the cashier confirms the card payment outside the POS.
- Cashier identity: fixed as "Cashier 1".

## Tools used
- AI: Claude Code ($20 plan), running in the terminal
- GitHub for the code
- Vercel for deployment

## AI use notes
- Search: I asked why "CC" also showed Cappuccino. Claude said Cappuccino's code was also CC. That was wrong. I checked menu.json: Cappuccino is CP and only Cold Coffee is CC. It matched because "cappuccino" contains the letters "cc" in the name. Search now puts an exact short-code match first and shows only that item.
- Zero-total bills first showed 'Settle · UPI · ₹0'. I changed them to 'No payment due' with no payment record.

## What I would build next
- Manager approval for large discounts and voids
- Wallet and loyalty payment modes
- Tips
- Shift handover and cash reconciliation
- Silent printing
