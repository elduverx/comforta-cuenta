const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../lib/db.ts');
let code = fs.readFileSync(dbPath, 'utf8');

const funcs = `
function getWeekId(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return \`\${d.getUTCFullYear()}-W\${weekNo.toString().padStart(2, '0')}\`;
}

function getDateFromWeekId(weekId: string): Date | null {
  const match = weekId.match(/^(\\d{4})-W(\\d{2})$/);
  if (!match) return null;
  const year = parseInt(match[1]);
  const week = parseInt(match[2]);
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dow = simple.getUTCDay();
  const ISOweekStart = simple;
  if (dow <= 4) {
    ISOweekStart.setDate(simple.getDate() - simple.getUTCDay() + 1);
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getUTCDay());
  }
  return ISOweekStart;
}
`;

code = code.replace("import path from 'path';", "import path from 'path';\n" + funcs);
fs.writeFileSync(dbPath, code);
