import { NextRequest, NextResponse } from 'next/server';
import { reverseGeocode } from '@/lib/geo-service';
import { LanguagePreference } from '@/lib/map-types';

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get('lat') || '');
  const lng = parseFloat(req.nextUrl.searchParams.get('lng') || '');
  const lang = (req.nextUrl.searchParams.get('lang') || 'en') as LanguagePreference;
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: 'lat, lng required' }, { status: 400 });
  }
  try {
    const place = await reverseGeocode(lat, lng, lang);
    return NextResponse.json(place);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Reverse geocode failed' }, { status: 500 });
  }
}
