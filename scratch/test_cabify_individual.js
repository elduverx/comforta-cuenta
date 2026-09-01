const fs = require('fs');
const lines = fs.readFileSync('scratch/cabify_raw_data.txt', 'utf8').split('\n').map(l => l.trim()).filter(l => l);

function parseIndividual() {
  const driver = {};
  
  // Find Name
  const fichaIndex = lines.findIndex(l => l === 'Ficha del conductor');
  if (fichaIndex !== -1) {
    // lines[fichaIndex + 1] is usually Initials
    // lines[fichaIndex + 2] is the full name
    let nameLine = lines[fichaIndex + 2];
    if (lines[fichaIndex + 1].length > 3) {
      nameLine = lines[fichaIndex + 1]; // In case there are no initials
    }
    driver.nombre = nameLine;
  }
  
  // Find Date
  const dateLine = lines.find(l => l.includes('(S'));
  driver.dateRange = dateLine || 'Semana Actual';
  
  // Find Finances
  const gtIndex = lines.findIndex(l => l === 'Ganancias totales');
  const caIndex = lines.findIndex(l => l === 'Cobro en app');
  const ceIndex = lines.findIndex(l => l === 'Cobro en efectivo');
  const pIndex = lines.findIndex(l => l === 'Promociones');
  const dIndex = lines.findIndex(l => l === 'Deducciones');
  const cbIndex = lines.findIndex(l => l === 'Cobrado a bordo');
  
  const parseEuro = (val) => {
    if (!val || val === '-') return 0;
    return parseFloat(val.replace('€', '').replace(/\./g, '').replace(',', '.'));
  };

  if (gtIndex !== -1) {
    driver.totalBruto = parseEuro(lines[gtIndex + 1]);
    driver.cobroApp = parseEuro(lines[caIndex + 1]);
    driver.totalEfectivo = parseEuro(lines[ceIndex + 1]);
    driver.bonos = parseEuro(lines[pIndex + 1]);
    driver.cobradoBordo = parseEuro(lines[cbIndex + 1]);
    
    // El efectivo real es la suma de Cobro en efectivo + Cobrado a Bordo
    driver.efectivoReal = driver.totalEfectivo + driver.cobradoBordo;
  }
  
  return driver;
}
console.log(parseIndividual());
