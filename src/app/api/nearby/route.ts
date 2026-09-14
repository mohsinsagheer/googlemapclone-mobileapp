import { NextRequest, NextResponse } from 'next/server';
import { findNearbyPlaces } from '@/lib/geo-service';
import { LanguagePreference } from '@/lib/map-types';

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get('lat') || '');
  const lng = parseFloat(req.nextUrl.searchParams.get('lng') || '');
  const query = req.nextUrl.searchParams.get('q') || '';
  const lang = (req.nextUrl.searchParams.get('lang') || 'en') as LanguagePreference;
  // tags is a comma-separated list like "amenity=restaurant,amenity=fast_food"
  const tagsParam = req.nextUrl.searchParams.get('tags') || '';
  const tags = tagsParam ? tagsParam.split(',').filter(Boolean) : undefined;
  if (Number.isNaN(lat) || Number.isNaN(lng) || !query) {
    return NextResponse.json({ error: 'lat, lng, q required' }, { status: 400 });
  }
  try {
    const results = await findNearbyPlaces(lat, lng, query, lang, tags);
    return NextResponse.json(results);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Nearby failed' }, { status: 500 });
  }
}
