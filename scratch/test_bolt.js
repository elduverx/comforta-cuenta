const allText = "Hoy 3 sep - 3 sep Ingresos brutos (total)";
const match = allText.match(/\d{1,2}\s+[a-z]{3,4}\s*[-–—]\s*\d{1,2}\s+[a-z]{3,4}/i);
console.log(match);
