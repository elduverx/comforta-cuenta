const fs = require('fs');
const html = fs.readFileSync('scratch/uber_raw_html.html', 'utf8');

const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
let match;
while ((match = imgRegex.exec(html)) !== null) {
  if (match[1].includes('http')) console.log(match[1]);
}
