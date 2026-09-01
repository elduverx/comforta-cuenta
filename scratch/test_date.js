const date = new Date("2026-08-31T12:00:00");
const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
const dayNum = d.getUTCDay() || 7;
d.setUTCDate(d.getUTCDate() + 4 - dayNum);
const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
const weekId = `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
console.log(weekId);
