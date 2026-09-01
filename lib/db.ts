import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data.json');

const defaultData = [
  { 
    id: "d1", 
    name: "EDWARD FERNANDO ASTAIZA GARCIA", 
    initials: "EF",
    platforms: {
      uber: { invoiced: 479.46, cash: 47.43, bonuses: 0 },
      cabify: { invoiced: 290.48, cash: 56.86, bonuses: 0 },
      bolt: { invoiced: 172.95, cash: 16.85, bonuses: 0 },
      privados: { invoiced: 0, cash: 0, bonuses: 0 }
    }
  }
];

function parseWeekId(dateString: string): string {
  if (!dateString) return "UNKNOWN";

  // Try Cabify Individual: "(S35)"
  let matchCabifyS = dateString.match(/\(S(\d+)\)/i);
  if (matchCabifyS) {
    const weekNo = matchCabifyS[1].padStart(2, '0');
    return `${new Date().getUTCFullYear()}-W${weekNo}`;
  }

  // Try Cabify: "10/08/2026 a 16/08/2026"
  let match = dateString.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    const [_, d, m, y] = match;
    const date = new Date(`${y}-${m}-${d}T00:00:00Z`);
    return getWeekId(date);
  }
  
  // Try Uber: "Aug 10th, 2026 04:00 AM"
  const months: Record<string, string> = {Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
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

  // Try Bolt: "3 ago - 31 ago"
  const mesesES: Record<string, string> = {ene:'01',feb:'02',mar:'03',abr:'04',may:'05',jun:'06',jul:'07',ago:'08',sep:'09',oct:'10',nov:'11',dic:'12'};
  const matchBolt = dateString.toLowerCase().match(/(\d{1,2})\s+([a-z]{3})/);
  if (matchBolt) {
     const d = matchBolt[1].padStart(2, '0');
     const num = mesesES[matchBolt[2]];
     if (num) {
        const y = new Date().getUTCFullYear();
        const date = new Date(`${y}-${num}-${d}T00:00:00Z`);
        return getWeekId(date);
     }
  }

  return "UNKNOWN";
}

function getWeekId(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

export function getDrivers(weekId?: string) {
  if (!fs.existsSync(DB_PATH)) return [];
  const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  
  if (Array.isArray(data)) return data;
  if (weekId && data[weekId]) return data[weekId];
  return [];
}

function getDateFromWeekId(weekId: string): Date | null {
  const match = weekId.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return null;
  const year = parseInt(match[1]);
  const week = parseInt(match[2]);
  
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dow = simple.getUTCDay();
  const ISOweekStart = simple;
  if (dow <= 4)
      ISOweekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
  else
      ISOweekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
  return ISOweekStart;
}

export function getDriversByRange(startDate: string, endDate: string) {
  if (!fs.existsSync(DB_PATH)) return [];
  const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0,0,0,0);
  end.setHours(23,59,59,999);
  
  const mergedDrivers: Record<string, any> = {};

  for (const [key, drivers] of Object.entries(data)) {
    if (key === 'master_drivers' || !Array.isArray(drivers)) continue;
    
    const weekDate = getDateFromWeekId(key);
    if (!weekDate) continue;
    
    // Check if week starts within the range
    if (weekDate >= start && weekDate <= end) {
      drivers.forEach((d: any) => {
        const nameKey = d.name.toLowerCase();
        if (!mergedDrivers[nameKey]) {
          mergedDrivers[nameKey] = JSON.parse(JSON.stringify(d));
          // Delete week-specific dateRange text for merged rows
          mergedDrivers[nameKey].dateRange = `Rango seleccionado`;
        } else {
          // Merge platforms
          const p = mergedDrivers[nameKey].platforms;
          for (const plat of ['uber', 'cabify', 'bolt', 'privados']) {
            if (!p[plat]) p[plat] = { invoiced: 0, cash: 0, bonuses: 0 };
            if (d.platforms[plat]) {
              p[plat].invoiced += d.platforms[plat].invoiced || 0;
              p[plat].cash += d.platforms[plat].cash || 0;
              p[plat].bonuses += d.platforms[plat].bonuses || 0;
            }
          }
        }
      });
    }
  }
  
  return Object.values(mergedDrivers);
}

function saveDrivers(drivers: any[], weekId?: string) {
  let data: any = {};
  if (fs.existsSync(DB_PATH)) {
    const raw = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    if (!Array.isArray(raw)) data = raw;
  }
  
  if (weekId) {
    data[weekId] = drivers;
  }
  
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function updateMasterRegistry(driver: any) {
  let data: any = {};
  if (fs.existsSync(DB_PATH)) {
    const raw = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    if (!Array.isArray(raw)) data = raw;
  }
  
  if (!data.master_drivers) data.master_drivers = {};
  
  const key = driver.name.toLowerCase();
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
    return Object.values(data.master_drivers);
  }
  return [];
}

export function syncPlatformData(plataforma: string, admin: string, dateRange: string, newDrivers: any[]) {
  const weekId = parseWeekId(dateRange);
  console.log(`Syncing data for week: ${weekId}`);
  
  const drivers = getDrivers(weekId);
  
  newDrivers.forEach(nd => {
    let existingDriver = drivers.find((d: any) => 
      d.name.toLowerCase() === nd.nombre.toLowerCase()
    );
    
    if (!existingDriver) {
      existingDriver = {
        id: "d" + Date.now() + Math.floor(Math.random()*100),
        name: nd.nombre,
        initials: nd.nombre.split(' ').map((n:string)=>n[0]).join('').substring(0,2),
        admin: admin,
        dateRange: dateRange,
        photoUrl: nd.photoUrl || null,
        platforms: {
          uber: { invoiced: 0, cash: 0, bonuses: 0 },
          cabify: { invoiced: 0, cash: 0, bonuses: 0 },
          bolt: { invoiced: 0, cash: 0, bonuses: 0 },
          privados: { invoiced: 0, cash: 0, bonuses: 0 }
        }
      };
      drivers.push(existingDriver);
    }
    
    // Update data for the specific platform
    existingDriver.platforms[plataforma] = {
      invoiced: nd.totalBruto,
      cash: nd.totalEfectivo,
      bonuses: nd.bonos
    };

    // Keep the photo updated if we found a new one
    if (nd.photoUrl) existingDriver.photoUrl = nd.photoUrl;
    existingDriver.admin = admin;
    existingDriver.dateRange = dateRange;

    // Guardar en el directorio maestro de conductores
    updateMasterRegistry(existingDriver);
  });
  
  saveDrivers(drivers, weekId);
}
