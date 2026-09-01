const fs = require('fs');
const text = fs.readFileSync('scratch/cabify_raw_data.txt', 'utf8');
const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

const startIndex = lines.findIndex(l => l === 'totales');
const drivers = [];

if (startIndex !== -1) {
  let currentIndex = startIndex + 1;
  while (currentIndex < lines.length) {
    const initials = lines[currentIndex];
    
    // Safety check if it's initials (length 2 and uppercase usually, but let's just skip non-breaking spaces)
    if (initials.length > 3 && !initials.includes('Sincronizando')) {
       currentIndex++;
       continue;
    }
    
    if (initials === 'Sincronizando...' || initials.includes('Total') || initials.includes('1 - ')) break;

    const name = lines[currentIndex + 1];
    const cobroApp = lines[currentIndex + 2];
    const efectivo = lines[currentIndex + 3];
    const promociones = lines[currentIndex + 4];
    const deducciones = lines[currentIndex + 5];
    const totalEarnings = lines[currentIndex + 6];

    if (totalEarnings && totalEarnings.includes('€')) {
      drivers.push({
        nombre: name,
        totalBruto: parseFloat(totalEarnings.replace('€', '').replace(/\./g, '').replace(',', '.')),
        totalEfectivo: parseFloat(efectivo.replace('€', '').replace(/\./g, '').replace(',', '.')),
        bonos: parseFloat(promociones.replace('€', '').replace(/\./g, '').replace(',', '.'))
      });
      currentIndex += 7;
    } else {
      currentIndex++;
    }
  }
}
console.log(drivers);
