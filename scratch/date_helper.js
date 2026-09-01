function parseWeekId(dateString) {
  // Try Cabify: "10/08/2026 a 16/08/2026 (S33)"
  let match = dateString.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    const [_, d, m, y] = match;
    const date = new Date(`${y}-${m}-${d}T00:00:00Z`);
    return getWeekId(date);
  }
  
  // Try Uber: "Aug 10th, 2026 04:00 AM" or "Aug 10, 2026"
  const months = {Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
  for (const [name, num] of Object.entries(months)) {
    if (dateString.includes(name)) {
      let dayMatch = dateString.match(new RegExp(`${name} (\\d{1,2})`));
      let yearMatch = dateString.match(/20\d{2}/);
      if (dayMatch && yearMatch) {
        let d = dayMatch[1].padStart(2, '0');
        let y = yearMatch[0];
        const date = new Date(`${y}-${num}-${d}T00:00:00Z`);
        return getWeekId(date);
      }
    }
  }
  return "UNKNOWN";
}

function getWeekId(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

console.log("Cabify:", parseWeekId("10/08/2026 a 16/08/2026 (S33)"));
console.log("Uber:", parseWeekId("Aug 10th, 2026 04:00 AM - Aug 17th, 2026 04:00 AM"));
