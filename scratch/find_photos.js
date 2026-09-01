const fs = require('fs');
const html = fs.readFileSync('scratch/uber_raw_html.html', 'utf8');

const nameIndex = html.indexOf('JOSE DOMINGO ACOSTA CAICEDO');
if (nameIndex !== -1) {
  // Look backwards for an <img> tag before the name
  const beforeName = html.substring(Math.max(0, nameIndex - 1000), nameIndex);
  const imgMatch = beforeName.match(/<img[^>]+src="([^"]+)"/);
  console.log("Photo URL for JOSE:", imgMatch ? imgMatch[1] : "Not found");
}

const adminMatches = html.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/g);
console.log("Possible headers for admin name:", adminMatches ? adminMatches.slice(0, 10) : []);

