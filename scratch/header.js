// Este script se inyecta automáticamente en las páginas de Uber, Cabify o Bolt.

function parseEuro(val) {
  if (!val || val === '-') return 0;
  return parseFloat(val.replace('€', '').replace(/\./g, '').replace(',', '.'));
}

