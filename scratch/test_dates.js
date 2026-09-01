function getDateFromWeekId(weekId) {
  const match = weekId.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return null;
  const year = parseInt(match[1]);
  const week = parseInt(match[2]);
  
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dow = simple.getUTCDay();
  const ISOweekStart = simple;
  if (dow <= 4)
      ISOweekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
  else
      ISOweekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
  return ISOweekStart;
}

const w35 = getDateFromWeekId("2026-W35");
console.log("W35 Start Date (UTC):", w35.toISOString());
console.log("W35 Start Date (Local):", w35.toString());

const startStr = "2026-08-23T22:00:00.000Z";
const endStr = "2026-08-30T21:59:59.999Z";

const start = new Date(startStr);
const end = new Date(endStr);
start.setHours(0,0,0,0);
end.setHours(23,59,59,999);

console.log("Filter Start (Local):", start.toString());
console.log("Filter End (Local):", end.toString());

console.log("Is W35 >= Start?", w35 >= start);
console.log("Is W35 <= End?", w35 <= end);

