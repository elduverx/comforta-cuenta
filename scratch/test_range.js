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
console.log("2026-W32:", getDateFromWeekId("2026-W32").toISOString());
console.log("2026-W36:", getDateFromWeekId("2026-W36").toISOString());
