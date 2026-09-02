import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data.json');

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const adminParam = searchParams.get('admin');

    if (!adminParam) {
      // Si no hay admin, borrar todo por seguridad / compatibilidad
      fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2));
    } else {
      // Filtrar y eliminar solo los conductores de ese admin
      if (fs.existsSync(DB_PATH)) {
        const raw = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
        if (typeof raw === 'object' && !Array.isArray(raw)) {
          const newData: any = {};
          
          for (const key of Object.keys(raw)) {
            if (key === 'master_drivers') {
              const masterDrivers = raw[key];
              const newMaster: any = {};
              for (const [mKey, mDriver] of Object.entries(masterDrivers)) {
                if ((mDriver as any).admin?.toLowerCase() !== adminParam.toLowerCase()) {
                  newMaster[mKey] = mDriver;
                }
              }
              newData[key] = newMaster;
            } else if (Array.isArray(raw[key])) {
              newData[key] = raw[key].filter((d: any) => (d.admin || '').toLowerCase() !== adminParam.toLowerCase());
            } else {
              newData[key] = raw[key];
            }
          }
          
          fs.writeFileSync(DB_PATH, JSON.stringify(newData, null, 2));
        }
      }
    }
    
    return NextResponse.json(
      { success: true, message: 'Datos borrados correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error clearing data:", error);
    return NextResponse.json(
      { success: false, error: 'Error borrando datos' },
      { status: 500 }
    );
  }
}
