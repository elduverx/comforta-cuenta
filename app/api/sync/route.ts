import { NextResponse } from 'next/server';

// Evitar problemas de CORS ya que la extensión llama desde un dominio distinto
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

import fs from 'fs';
import path from 'path';
import { syncPlatformData } from '@/lib/db';

async function downloadAndSaveAvatar(url: string, platform: string, driverName: string): Promise<string> {
  if (!url || url.startsWith('/avatars/')) return url;
  
  try {
    const response = await fetch(url);
    if (!response.ok) return url;
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const safeName = driverName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const ext = url.includes('.png') ? '.png' : '.jpg';
    const filename = `${platform}_${safeName}${ext}`;
    
    const avatarsDir = path.join(process.cwd(), 'public', 'avatars');
    if (!fs.existsSync(avatarsDir)) {
      fs.mkdirSync(avatarsDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(avatarsDir, filename), buffer);
    return `/avatars/${filename}`;
  } catch (error) {
    console.error("Failed to download avatar:", error);
    return url;
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    console.log("=========================================");
    console.log(`🚀 ¡NUEVA SINCRONIZACIÓN DE ${data.plataforma.toUpperCase()}!`);
    console.log("=========================================");
    console.log("URL de origen:", data.url);
    
    if (data.data && data.data.length > 0) {
      // Persistir las imágenes localmente
      for (const driver of data.data) {
        if (driver.photoUrl) {
          driver.photoUrl = await downloadAndSaveAvatar(driver.photoUrl, data.plataforma, driver.nombre);
        }
      }

      console.log(`✅ Se extrajeron ${data.data.length} conductores con éxito:`);
      console.table(data.data);
      
      // Guardar en la "base de datos" local
      syncPlatformData(data.plataforma, data.admin, data.dateRange, data.data);
      console.log(`💾 Base de datos actualizada con los nuevos datos de ${data.plataforma}`);
    } else {
      console.log("⚠️ No se extrajeron conductores. El formato de la página podría ser diferente.");
    }
    
    // Guardar el texto extraído en un archivo local por si necesitamos depurar
    if (data.rawText) {
      const filePath = path.join(process.cwd(), 'scratch', `${data.plataforma}_raw_data.txt`);
      if (!fs.existsSync(path.dirname(filePath))) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
      }
      fs.writeFileSync(filePath, data.rawText);
    }

    if (data.rawHtml) {
      const htmlPath = path.join(process.cwd(), 'scratch', `${data.plataforma}_raw_html.html`);
      fs.writeFileSync(htmlPath, data.rawHtml);
      console.log(`✅ HTML en bruto guardado para extraer fotos y nombres de admin.`);
    }
    
    return NextResponse.json(
      { success: true, message: 'Datos recibidos correctamente', data },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error("Error procesando los datos de la extensión:", error);
    return NextResponse.json(
      { success: false, error: 'Error procesando datos' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
}
