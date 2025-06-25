# SHEΔR iQ Bale Scanner PWA

This repository contains a progressive web app for scanning bale QR codes, tracking counts and exporting data as CSV.

## Getting Started

This PWA is a completely static site. There are no build tools or runtime dependencies required.

1. Clone the repository.
2.There are no Node dependencies to install, so you can skip `npm install`.
## Serving Locally

The app needs to be served over HTTP(S) to enable service worker features. You can use any static server. Example using Python:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

## Build/Deployment

There is no build step. Simply deploy all files in this repository to any static hosting provider or web server. Ensure the site is served over HTTPS to allow installation as a PWA.
