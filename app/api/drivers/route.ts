import { NextResponse } from 'next/server';
import { getDrivers, getMasterDrivers, getDriversByRange } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    
    if (type === 'master') {
      const masterDrivers = getMasterDrivers();
      return NextResponse.json(masterDrivers);
    }
    
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    
    if (start && end) {
      const drivers = getDriversByRange(start, end);
      return NextResponse.json(drivers);
    }

    const weekId = searchParams.get('week') || undefined;
    const drivers = getDrivers(weekId);
    return NextResponse.json(drivers);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching drivers' }, { status: 500 });
  }
}
