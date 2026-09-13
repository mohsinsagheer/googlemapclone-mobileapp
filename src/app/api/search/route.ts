import { NextRequest, NextResponse } from 'next/server';
import { geocodeSearch } from '@/lib/geo-service';
import { LanguagePreference } from '@/lib/map-types';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || '';
  const lang = (req.nextUrl.searchParams.get('lang') || 'en') as LanguagePreference;
  if (!q.trim()) return NextResponse.json([]);
  try {
    const results = await geocodeSearch(q, lang);
    return NextResponse.json(results);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Search failed' }, { status: 500 });
  }
}
