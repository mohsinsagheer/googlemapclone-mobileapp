import { NextRequest, NextResponse } from 'next/server';
import { getRoute } from '@/lib/geo-service';
import { TravelMode } from '@/lib/map-types';

export async function GET(req: NextRequest) {
  const oLat = parseFloat(req.nextUrl.searchParams.get('olat') || '');
  const oLng = parseFloat(req.nextUrl.searchParams.get('olng') || '');
  const dLat = parseFloat(req.nextUrl.searchParams.get('dlat') || '');
  const dLng = parseFloat(req.nextUrl.searchParams.get('dlng') || '');
  const mode = (req.nextUrl.searchParams.get('mode') || 'driving') as TravelMode;

  if ([oLat, oLng, dLat, dLng].some(Number.isNaN)) {
    return NextResponse.json({ error: 'olat, olng, dlat, dlng required' }, { status: 400 });
  }

  try {
    const route = await getRoute({ lat: oLat, lng: oLng }, { lat: dLat, lng: dLng }, mode);
    if (!route) return NextResponse.json({ error: 'No route found' }, { status: 404 });
    return NextResponse.json(route);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Routing failed' }, { status: 500 });
  }
}
