# YourLandscape — Minimal Landscaping Calculator

This is a single-page web app (HTML/CSS/JS) implementing:

- Tax calculator (shows tax amount and final total)
- Flyer cost addition
- Material scoop calculator (scoops needed, material cost)
- Delivery location selection with prices
- Inventory (persistent via localStorage) with add/edit/delete
- Order list with plus/minus quantity controls
- CSV import/export for inventory

How to run:

Open `index.html` in a browser (no server required).

CSV format (header):

`name,cov,price_small,price_medium,price_large,stock`

Notes:

- Coverage per scoop is interpreted as "square feet covered per 1 inch depth by one scoop". Scoops needed = area * depth(inches) / coverage.
- Inventory persists in browser `localStorage`.
