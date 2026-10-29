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

## Mock data
- menu.json in the restaurant_pos folder is the seed data. Load it on first run.

## What is mocked
- (to fill)

## Tools used
- AI: Claude Code ($20 plan), running in the terminal
- GitHub for the code
- Vercel for deployment

## AI use notes
- Search: I asked why "CC" also showed Cappuccino. Claude said Cappuccino's code was also CC. That was wrong. I checked menu.json: Cappuccino is CP and only Cold Coffee is CC. It matched because "cappuccino" contains the letters "cc" in the name. Search now puts an exact short-code match first and shows only that item.
- (to fill as I build)

## What I would build next
- (to fill)
