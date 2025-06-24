# SHEΔR iQ Bale Scanner PWA

This repository contains a progressive web app for scanning bale QR codes, tracking counts and exporting data as CSV.

## Data Storage

Each scanned bale is stored in the browser's `localStorage` under a key based on the farm name (`csvData_<farm>`). When exporting, the app combines any previous entries for that farm with the current day's scans so the CSV contains all records accumulated over time.

If a bale is removed using **Delete Last Entry**, the corresponding record is also deleted from `localStorage` so the exported CSV only includes the bales currently listed in the on-screen table.
