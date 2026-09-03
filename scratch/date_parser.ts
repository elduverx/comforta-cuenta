export function parseRawDateRange(rawDateRange: string): { startDate: string, endDate: string } {
  const currentYear = new Date().getUTCFullYear();
  let start = new Date();
  let end = new Date();

  const mesesES: Record<string, string> = { ene:'01', feb:'02', mar:'03', abr:'04', may:'05', jun:'06', jul:'07', ago:'08', sep:'09', oct:'10', nov:'11', dic:'12' };
  const monthsEN: Record<string, string> = { jan:'01', feb:'02', mar:'03', apr:'04', may:'05', jun:'06', jul:'07', aug:'08', sep:'09', oct:'10', nov:'11', dec:'12' };

  if (!rawDateRange) {
    // Fallback: This week
    return getFallbackWeek();
  }

  const raw = rawDateRange.toLowerCase().trim();

  // Cabify format: "10/08/2026 a 16/08/2026" or "10/08/2026"
  const cabifyRange = raw.match(/(\d{2})\/(\d{2})\/(\d{4}).*?a.*?(\d{2})\/(\d{2})\/(\d{4})/);
  if (cabifyRange) {
    return {
      startDate: `${cabifyRange[3]}-${cabifyRange[2]}-${cabifyRange[1]}`,
      endDate: `${cabifyRange[6]}-${cabifyRange[5]}-${cabifyRange[4]}`
    };
  }

  const cabifyDay = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (cabifyDay) {
    const d = `${cabifyDay[3]}-${cabifyDay[2]}-${cabifyDay[1]}`;
    return { startDate: d, endDate: d };
  }

  // S35 format
  const sMatch = raw.match(/s(\d{1,2})/);
  if (sMatch) {
    const weekNum = parseInt(sMatch[1]);
    const d = new Date(Date.UTC(currentYear, 0, 1 + (weekNum - 1) * 7));
    const dow = d.getUTCDay();
    if (dow <= 4) d.setUTCDate(d.getUTCDate() - d.getUTCDay() + 1);
    else d.setUTCDate(d.getUTCDate() + 8 - d.getUTCDay());
    const weekEnd = new Date(d);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    return {
       startDate: d.toISOString().split('T')[0],
       endDate: weekEnd.toISOString().split('T')[0]
    };
  }

  // Bolt / Uber format: "3 ago - 31 ago" or "Aug 10 - Aug 16"
  const textRange = raw.match(/(\d{1,2})\s+([a-z]+)\s*-\s*(\d{1,2})\s+([a-z]+)/);
  if (textRange) {
     const parseMonth = (m: string) => {
        const str = m.substring(0,3);
        return mesesES[str] || monthsEN[str] || '01';
     };
     const sMonth = parseMonth(textRange[2]);
     const eMonth = parseMonth(textRange[4]);
     const sDay = textRange[1].padStart(2, '0');
     const eDay = textRange[3].padStart(2, '0');
     return {
        startDate: `${currentYear}-${sMonth}-${sDay}`,
        endDate: `${currentYear}-${eMonth}-${eDay}`
     };
  }
  
  // Uber format inverted: "Aug 10 - Aug 16" -> "aug 10 - aug 16"
  const textRangeInv = raw.match(/([a-z]+)\s+(\d{1,2})\s*-\s*([a-z]+)\s+(\d{1,2})/);
  if (textRangeInv) {
     const parseMonth = (m: string) => {
        const str = m.substring(0,3);
        return mesesES[str] || monthsEN[str] || '01';
     };
     const sMonth = parseMonth(textRangeInv[1]);
     const eMonth = parseMonth(textRangeInv[3]);
     const sDay = textRangeInv[2].padStart(2, '0');
     const eDay = textRangeInv[4].padStart(2, '0');
     return {
        startDate: `${currentYear}-${sMonth}-${sDay}`,
        endDate: `${currentYear}-${eMonth}-${eDay}`
     };
  }

  // Text single day: "3 ago" or "Aug 3"
  const textDay = raw.match(/(\d{1,2})\s+([a-z]+)/);
  if (textDay) {
     const mStr = textDay[2].substring(0,3);
     const num = mesesES[mStr] || monthsEN[mStr] || '01';
     const d = `${currentYear}-${num}-${textDay[1].padStart(2, '0')}`;
     return { startDate: d, endDate: d };
  }
  
  const textDayInv = raw.match(/([a-z]+)\s+(\d{1,2})/);
  if (textDayInv) {
     const mStr = textDayInv[1].substring(0,3);
     const num = mesesES[mStr] || monthsEN[mStr] || '01';
     const d = `${currentYear}-${num}-${textDayInv[2].padStart(2, '0')}`;
     return { startDate: d, endDate: d };
  }

  return getFallbackWeek();
}

function getFallbackWeek() {
  const d = new Date();
  const day = d.getUTCDay() || 7;
  const start = new Date(d);
  start.setUTCDate(start.getUTCDate() - day + 1);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0]
  };
}
