const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../data.json');
const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

if (data.syncs) {
  let changed = false;
  data.syncs.forEach(s => {
    if (s.id === 'bolt_Oscar_2026-08-01_2026-08-01') {
      s.startDate = '2026-08-31';
      s.endDate = '2026-09-06';
      s.id = 'bolt_Oscar_2026-08-31_2026-09-06';
      changed = true;
    }
  });
  if (changed) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    console.log("Fixed Bolt dates in data.json");
  }
}
