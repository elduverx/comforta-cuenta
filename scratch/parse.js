const fs = require('fs');
const text = fs.readFileSync('scratch/uber_raw_data.txt', 'utf8');
const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

const startIndex = lines.indexOf('Block Cash Trips');
if (startIndex !== -1) {
  let currentIndex = startIndex + 1;
  const drivers = [];
  while (currentIndex < lines.length) {
    const name = lines[currentIndex];
    // Check if we hit pagination "10 rows" or "❮❮"
    if (name.includes('rows') || name === '❮❮' || name === 'First') break;
    
    const totalEarnings = lines[currentIndex + 1];
    const earningsHr = lines[currentIndex + 2];
    const cashEarnings = lines[currentIndex + 3];
    const tripsHr = lines[currentIndex + 4];
    const hoursOnline = lines[currentIndex + 5];
    const trips = lines[currentIndex + 6];
    const acceptance = lines[currentIndex + 7];
    const cancellation = lines[currentIndex + 8];
    const block = lines[currentIndex + 9];

    if (totalEarnings && totalEarnings.startsWith('€')) {
      drivers.push({
        nombre: name,
        totalBruto: parseFloat(totalEarnings.replace('€', '').replace(',', '')),
        totalEfectivo: parseFloat(cashEarnings.replace('€', '').replace(',', ''))
      });
      currentIndex += 10;
    } else {
       // if it doesn't match the pattern, maybe pagination or something
       currentIndex++;
    }
  }
  console.log(drivers);
}
