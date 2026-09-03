import fs from 'fs';
import path from 'path';

function getWeekId(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

function getDateFromWeekId(weekId: string): Date | null {
  const match = weekId.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return null;
  const year = parseInt(match[1]);
  const week = parseInt(match[2]);
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dow = simple.getUTCDay();
  const ISOweekStart = simple;
  if (dow <= 4) {
    ISOweekStart.setDate(simple.getDate() - simple.getUTCDay() + 1);
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getUTCDay());
  }
  return ISOweekStart;
}


const DB_PATH = path.join(process.cwd(), 'data.json');

// Get dates between start and end (inclusive)
function getDatesInRange(startStr: string, endStr: string): string[] {
  const dates = [];
  let current = new Date(startStr);
  const end = new Date(endStr);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

export function getDriversByRange(startStr: string, endStr: string) {
  if (!fs.existsSync(DB_PATH)) return [];
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  let data;
  try { data = JSON.parse(raw); } catch { return []; }

  let needsSave = false;
  if (!data.syncs) {
     data.syncs = [];
     needsSave = true;
  }
  
  // Always check for old week keys and migrate them permanently
  for (const key of Object.keys(data)) {
    if (key === 'master_drivers' || key === 'syncs') continue;
    if (!Array.isArray(data[key])) continue;
    
    const weekDate = getDateFromWeekId(key);
    if (!weekDate) continue;
    const weekEnd = new Date(weekDate);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    
    for (const plat of ['uber', 'cabify', 'bolt', 'privados']) {
       const platDrivers = data[key].filter((d: any) => d.platforms[plat] && (d.platforms[plat].invoiced > 0 || d.platforms[plat].cash > 0));
       if (platDrivers.length > 0) {
          data.syncs.push({
             id: `${plat}_migrated_${key}`,
             platform: plat,
             admin: 'Oscar', // Assume Oscar for migrated data if unknown
             startDate: weekDate.toISOString().split('T')[0],
             endDate: weekEnd.toISOString().split('T')[0],
             timestamp: new Date().toISOString(),
             drivers: platDrivers.map((d: any) => ({
                id: d.id, name: d.name, initials: d.initials, photoUrl: d.photoUrl, admin: d.admin,
                invoiced: d.platforms[plat].invoiced,
                cash: d.platforms[plat].cash,
                bonuses: d.platforms[plat].bonuses,
                cobradoABordo: d.platforms[plat].cobradoABordo
             }))
          });
       }
    }
    // Delete the old key so we don't migrate it again
    delete data[key];
    needsSave = true;
  }

  if (needsSave) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  }

  const start = new Date(startStr).toISOString().split('T')[0];
  const end = new Date(endStr).toISOString().split('T')[0];
  const targetDays = new Set(getDatesInRange(start, end));

  // Find overlapping syncs
  const validSyncs = data.syncs.filter((s: any) => {
    return s.startDate <= end && s.endDate >= start;
  });

  // Hierarchical Deduplication per platform + admin
  // For a specific platform+admin, we sort syncs by duration descending.
  // We track which days have been covered.
  
  const deduplicatedSyncs = [];
  const groupedSyncs: Record<string, any[]> = {};
  
  for (const s of validSyncs) {
     const groupKey = `${s.platform}_${s.admin}`;
     if (!groupedSyncs[groupKey]) groupedSyncs[groupKey] = [];
     groupedSyncs[groupKey].push(s);
  }

  for (const groupKey of Object.keys(groupedSyncs)) {
     const syncs = groupedSyncs[groupKey];
     // Sort by duration descending
     syncs.sort((a, b) => {
        const aLen = getDatesInRange(a.startDate, a.endDate).length;
        const bLen = getDatesInRange(b.startDate, b.endDate).length;
        return bLen - aLen;
     });

     const coveredDays = new Set<string>();
     for (const s of syncs) {
        const sDays = getDatesInRange(s.startDate, s.endDate);
        // Check if ANY day of this sync is already covered
        const isCovered = sDays.some(d => coveredDays.has(d));
        if (!isCovered) {
           deduplicatedSyncs.push(s);
           sDays.forEach(d => coveredDays.add(d));
        }
     }
  }

  // Now we merge the deduplicated syncs into the old structure format for the UI
  const mergedDrivers: Record<string, any> = {};

  for (const s of deduplicatedSyncs) {
     // Prorate? No, we don't prorate. The user wants the exact sync amounts.
     for (const d of s.drivers) {
        const nameKey = d.name.toLowerCase() + '-' + (d.admin || '').toLowerCase();
        if (!mergedDrivers[nameKey]) {
           mergedDrivers[nameKey] = {
              id: d.id, name: d.name, initials: d.initials, photoUrl: d.photoUrl,
              admin: d.admin, dateRange: 'Rango seleccionado',
              platforms: {
                 uber: { invoiced: 0, cash: 0, bonuses: 0, cobradoABordo: 0 },
                 cabify: { invoiced: 0, cash: 0, bonuses: 0, cobradoABordo: 0 },
                 bolt: { invoiced: 0, cash: 0, bonuses: 0, cobradoABordo: 0 },
                 privados: { invoiced: 0, cash: 0, bonuses: 0, cobradoABordo: 0 }
              }
           };
        }
        
        // Accumulate
        const p = mergedDrivers[nameKey].platforms[s.platform];
        if (p) {
           p.invoiced += d.invoiced || 0;
           p.cash += d.cash || 0;
           p.bonuses += d.bonuses || 0;
           p.cobradoABordo += d.cobradoABordo || 0;
        }
        if (d.photoUrl) {
           mergedDrivers[nameKey].photoUrl = d.photoUrl;
        }
     }
  }

  return Object.values(mergedDrivers);
}

export function syncPlatformData(dataPayload: any) {
  let data: any = {};
  if (fs.existsSync(DB_PATH)) {
    try {
      data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    } catch {}
  }
  
  if (!data.syncs) {
    data.syncs = [];
  }

  const { plataforma, admin, data: newDrivers, rawDateRange } = dataPayload;
  
  // Use our powerful new date parser to get exact start and end dates from the raw text
  let { startDate, endDate } = parseRawDateRange(rawDateRange);

  // If the payload explicitly provides dates (e.g. from an old extension version or tests), use them
  if (dataPayload.startDate && dataPayload.endDate) {
    startDate = dataPayload.startDate;
    endDate = dataPayload.endDate;
  }
  
  const id = `${plataforma}_${admin}_${startDate}_${endDate}`;
  
  const syncDrivers = newDrivers.map((nd: any) => {
    // Generar ID
    let driverId = nd.nombre.toLowerCase().replace(/[^a-z0-9]/g, '');
    let initials = nd.nombre.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
    
    // update master registry
    updateMasterRegistry({
       id: driverId,
       name: nd.nombre,
       initials: initials,
       photoUrl: nd.photoUrl || null,
       admin: admin
    });

    return {
       id: driverId,
       name: nd.nombre,
       initials: initials,
       photoUrl: nd.photoUrl || null,
       admin: admin,
       invoiced: nd.totalBruto,
       cash: nd.totalEfectivo,
       bonuses: nd.bonos,
       cobradoABordo: nd.cobradoABordo === null ? null : (nd.cobradoABordo || 0)
    };
  });

  // Find if this exact sync exists
  const existingIndex = data.syncs.findIndex((s: any) => s.id === id);
  const newSync = {
    id, platform: plataforma, admin, startDate, endDate, timestamp: new Date().toISOString(),
    drivers: syncDrivers
  };

  if (existingIndex !== -1) {
    // If it exists, but someone syncs cabify global (cobradoABordo = null) and we already have values, preserve them!
    const existingSync = data.syncs[existingIndex];
    for (const nd of newSync.drivers) {
       if (nd.cobradoABordo === null) {
          const oldDriver = existingSync.drivers.find((d: any) => d.id === nd.id);
          nd.cobradoABordo = oldDriver ? oldDriver.cobradoABordo : null;
       }
       if (!nd.photoUrl) {
          const oldDriver = existingSync.drivers.find((d: any) => d.id === nd.id);
          if (oldDriver && oldDriver.photoUrl) nd.photoUrl = oldDriver.photoUrl;
       }
    }
    data.syncs[existingIndex] = newSync;
  } else {
    data.syncs.push(newSync);
  }

  // Remove fully contained smaller syncs (e.g. if we sync Week, delete Days)
  // Or do we keep them and let deduplication handle it?
  // Let deduplication handle it on read! But wait, if they sync Day 1, Day 2, and then Week, deduplication will ignore Day 1 and Day 2 perfectly!
  // Keeping them is safer for auditing. We don't need to delete them.

  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function updateMasterRegistry(driver: any) {
  let data: any = {};
  if (fs.existsSync(DB_PATH)) {
    try { data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')); } catch {}
  }
  
  if (!data.master_drivers) data.master_drivers = {};
  
  const key = driver.name.toLowerCase() + '-' + (driver.admin || '').toLowerCase();
  if (!data.master_drivers[key]) {
    data.master_drivers[key] = {
      id: driver.id,
      name: driver.name,
      initials: driver.initials,
      photoUrl: driver.photoUrl || null,
      admin: driver.admin,
      firstSeen: new Date().toISOString()
    };
  } else {
    if (driver.photoUrl) data.master_drivers[key].photoUrl = driver.photoUrl;
    data.master_drivers[key].admin = driver.admin;
  }
  
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export function getMasterDrivers() {
  if (!fs.existsSync(DB_PATH)) return [];
  const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  if (data.master_drivers) {
    return Object.values(data.master_drivers).sort((a: any, b: any) => a.name.localeCompare(b.name));
  }
  return [];
}

export function clearDatabase(adminParam?: string) {
  if (!fs.existsSync(DB_PATH)) return;
  const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  
  if (adminParam) {
    if (data.syncs) {
       data.syncs = data.syncs.filter((s: any) => (s.admin || '').toLowerCase() !== adminParam.toLowerCase());
    }
    
    // Clear master registry only for this admin
    if (data.master_drivers) {
      const filteredMasters: any = {};
      for (const [key, driver] of Object.entries(data.master_drivers)) {
        if (((driver as any).admin || '').toLowerCase() !== adminParam.toLowerCase()) {
          filteredMasters[key] = driver;
        }
      }
      data.master_drivers = filteredMasters;
    }
    
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } else {
    // Si no hay admin, borrar todo
    fs.writeFileSync(DB_PATH, JSON.stringify({ master_drivers: {}, syncs: [] }, null, 2));
  }
}
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

  // Cabify format: "10/08/2026 a 16/08/2026" or "01/08/2026 - 31/08/2026"
  const cabifyRange = raw.match(/(\d{2})\/(\d{2})\/(\d{4}).*?(?:a|-).*?(\d{2})\/(\d{2})\/(\d{4})/);
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

  // Uber detailed format: "Aug 31st, 2026 04:00 AM - Sep 7th, 2026 04:00 AM"
  const uberFull = raw.match(/([a-z]{3})\s+(\d{1,2})(?:st|nd|rd|th)?,\s+(\d{4}).*?-\s*([a-z]{3})\s+(\d{1,2})(?:st|nd|rd|th)?,\s+(\d{4})/i);
  if (uberFull) {
     const parseMonth = (m: string) => {
        const str = m.substring(0,3);
        return mesesES[str] || monthsEN[str] || '01';
     };
     const sMonth = parseMonth(uberFull[1]);
     const sDay = uberFull[2].padStart(2, '0');
     const sYear = uberFull[3];
     
     const eMonth = parseMonth(uberFull[4]);
     const eDay = uberFull[5].padStart(2, '0');
     const eYear = uberFull[6];

     // Uber ends on Monday 04:00 AM, which is technically the end of Sunday.
     // Subtract 1 day from endDate so it aligns correctly with the 7-day week (Mon-Sun).
     const realEnd = new Date(Date.UTC(parseInt(eYear), parseInt(eMonth)-1, parseInt(eDay)));
     realEnd.setUTCDate(realEnd.getUTCDate() - 1);

     return {
        startDate: `${sYear}-${sMonth}-${sDay}`,
        endDate: realEnd.toISOString().split('T')[0]
     };
  }

  // Bolt / Uber format: "3 ago - 31 ago", "3 sep. - 3 sep.", "3 sep - 3 sep"
  const textRange = raw.match(/(\d{1,2})\s*([a-z]+)\.?\s*[-–—]\s*(\d{1,2})\s*([a-z]+)\.?/i);
  if (textRange) {
     const parseMonth = (m: string) => {
        const str = m.substring(0,3);
        return mesesES[str] || monthsEN[str] || '01';
     };
     const sMonth = parseMonth(textRange[2]);
     const eMonth = parseMonth(textRange[4]);
     const sDay = textRange[1].padStart(2, '0');
     const eDay = textRange[3].padStart(2, '0');
     
     // Handle same day cases like "3 sep - 3 sep"
     return {
        startDate: `${currentYear}-${sMonth}-${sDay}`,
        endDate: `${currentYear}-${eMonth}-${eDay}`
     };
  }
  
  // Uber format inverted: "Aug 10 - Aug 16" -> "aug 10 - aug 16"
  const textRangeInv = raw.match(/([a-z]+)\.?\s*(\d{1,2})\s*[-–—]\s*([a-z]+)\.?\s*(\d{1,2})/i);
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
  const textDay = raw.match(/(\d{1,2})\s+([a-z]+)\.?/i);
  if (textDay) {
     const mStr = textDay[2].substring(0,3);
     const num = mesesES[mStr] || monthsEN[mStr] || '01';
     const d = `${currentYear}-${num}-${textDay[1].padStart(2, '0')}`;
     return { startDate: d, endDate: d };
  }
  
  const textDayInv = raw.match(/([a-z]+)\.?\s+(\d{1,2})/i);
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
