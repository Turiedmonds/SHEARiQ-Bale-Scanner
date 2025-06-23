const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, '..', 'service-worker.js');
const swContent = fs.readFileSync(swPath, 'utf8');
const match = swContent.match(/const\s+urlsToCache\s*=\s*\[([\s\S]*?)\];/);
if (!match) {
  throw new Error('urlsToCache array not found in service-worker.js');
}
let urls;
try {
  urls = eval('[' + match[1] + ']');
} catch (err) {
  throw new Error('Failed to parse urlsToCache: ' + err.message);
}

if (!Array.isArray(urls)) {
  throw new Error('urlsToCache is not an array');
}

urls.forEach((url) => {
  const filePath = path.join(__dirname, '..', url);
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${url}`);
  }
});

console.log('All service worker cache paths exist.');
