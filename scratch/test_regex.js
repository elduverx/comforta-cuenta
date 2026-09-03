const txt = "Aug 31st, 2026 04:00 AM - Sep 7th, 2026 04:00 AM";
const match = txt.match(/([a-z]{3})\s+(\d{1,2})(?:st|nd|rd|th)?,\s+(\d{4}).*?-\s*([a-z]{3})\s+(\d{1,2})(?:st|nd|rd|th)?,\s+(\d{4})/i);
console.log(match);
