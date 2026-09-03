import { NextResponse } from 'next/server';
import { syncPlatformData } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

// Configuración de Claude
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    // Si el payload ya trae los datos (ej. si estaban usando la versión vieja de la extensión)
    // O si la extensión nueva solo trae rawText
    if (!payload.data && payload.rawText) {
      if (!process.env.ANTHROPIC_API_KEY) {
        return NextResponse.json({ error: 'Falta ANTHROPIC_API_KEY en .env.local' }, { status: 500 });
      }

      console.log(`Llamando a Claude para analizar texto de ${payload.plataforma}...`);

      const systemPrompt = `
      Eres una IA contable experta. Tu tarea es extraer la fecha de inicio, fecha de fin y la tabla de conductores de este texto en crudo copiado de un portal de ${payload.plataforma}.
      
      Reglas estrictas:
      1. Extrae la fecha en que se enmarca este reporte. Para Uber las fechas terminan el lunes a las 04:00 AM, así que el endDate debe ser el domingo anterior.
      2. Extrae la lista de conductores.
      3. Para Bolt: extrae 'Ingresos brutos (total)' como totalBruto, e 'Ingresos brutos (pagos en efectivo)' como totalEfectivo.
      4. Para Cabify: extrae 'Ganancias totales' como totalBruto, y 'Cobrado a bordo' como cobradoABordo (si no existe, pon null).
      5. Para Uber: extrae el Total Earnings como totalBruto y Cash Earnings como totalEfectivo.
      6. Todas las cifras monetarias deben ser números decimales float (ej. 1200.50). Ten en cuenta el formato europeo (comas y puntos).
      7. Debes devolver ESTRICTAMENTE y ÚNICAMENTE un objeto JSON válido con la siguiente estructura, sin texto adicional antes ni después:
      {
        "startDate": "YYYY-MM-DD",
        "endDate": "YYYY-MM-DD",
        "data": [
          {
            "nombre": "Nombre del Conductor",
            "totalBruto": 0.0,
            "totalEfectivo": 0.0,
            "cobradoABordo": null,
            "bonos": 0.0,
            "photoUrl": ""
          }
        ]
      }`;

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 2000,
        temperature: 0.1,
        system: systemPrompt,
        messages: [
          { role: "user", content: "Texto a analizar:\n" + payload.rawText }
        ]
      });

      const jsonString = response.content[0].text;
      
      try {
         const parsedAiData = JSON.parse(jsonString);
         console.log("IA extrajo correctamente:", parsedAiData);
         
         // Inyectar al payload para la base de datos
         payload.data = parsedAiData.data;
         payload.startDate = parsedAiData.startDate;
         payload.endDate = parsedAiData.endDate;
         
         // Quitamos el rawDateRange para que lib/db.ts no intente reescribir las fechas que dio Claude
         delete payload.rawDateRange;
      } catch(err) {
         console.error("Claude no devolvió JSON válido:", jsonString);
         return NextResponse.json({ error: 'La IA no devolvió un formato correcto' }, { status: 500 });
      }
    }

    // Pasamos el payload (ya sea el original de la vieja extensión o el enriquecido por la IA)
    syncPlatformData(payload);
    
    return NextResponse.json({ success: true, timestamp: new Date() });
  } catch (error) {
    console.error('Error procesando sync:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
