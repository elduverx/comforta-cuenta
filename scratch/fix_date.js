const raw = "01/08/2026 - 31/08/2026";
const cabifyRange = raw.match(/(\d{2})\/(\d{2})\/(\d{4}).*?(?:a|-).*?(\d{2})\/(\d{2})\/(\d{4})/);
console.log(cabifyRange);
