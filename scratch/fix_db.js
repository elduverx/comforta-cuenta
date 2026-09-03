const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../data.json');
const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

if (data.syncs) {
  let changed = false;
  data.syncs.forEach(s => {
    if (s.platform === 'uber' && s.endDate) {
      const start = new Date(s.startDate);
      const end = new Date(s.endDate);
      // If it's exactly 7 days difference (8 days inclusive) e.g. 31 to 7
      if ((end - start) / 86400000 === 7) {
         const newEnd = new Date(end);
         newEnd.setUTCDate(newEnd.getUTCDate() - 1);
         s.endDate = newEnd.toISOString().split('T')[0];
         s.id = `${s.platform}_${s.admin}_${s.startDate}_${s.endDate}`;
         changed = true;
      }
    }
  });
  if (changed) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    console.log("Fixed data.json dates");
  }
}
