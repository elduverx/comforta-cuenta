const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'data.json');
if (!fs.existsSync(DB_PATH)) process.exit(0);

const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

async function migrate() {
  const avatarsDir = path.join(process.cwd(), 'public', 'avatars');
  if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });

  const master = data.master_drivers || {};
  for (const key of Object.keys(master)) {
    const driver = master[key];
    if (driver.photoUrl && !driver.photoUrl.startsWith('/avatars/')) {
       console.log(`Downloading for ${driver.name}: ${driver.photoUrl}`);
       try {
         const res = await fetch(driver.photoUrl);
         if (res.ok) {
            const arrayBuffer = await res.arrayBuffer();
            const safeName = driver.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const ext = driver.photoUrl.includes('.png') ? '.png' : '.jpg';
            const filename = `migrated_${safeName}${ext}`;
            fs.writeFileSync(path.join(avatarsDir, filename), Buffer.from(arrayBuffer));
            driver.photoUrl = `/avatars/${filename}`;
            console.log(`Saved -> ${driver.photoUrl}`);
         }
       } catch (e) {
         console.error(`Failed ${driver.name}`, e);
       }
    }
  }
  
  // also migrate in weeks
  for (const week of Object.keys(data)) {
    if (week === 'master_drivers') continue;
    for (const d of data[week]) {
      if (d.photoUrl && !d.photoUrl.startsWith('/avatars/')) {
        const masterD = master[d.name.toLowerCase()];
        if (masterD && masterD.photoUrl) {
           d.photoUrl = masterD.photoUrl; // sync with master
        }
      }
    }
  }
  
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  console.log("Migration complete!");
}

migrate();
