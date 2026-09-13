import { PlaceCategory } from './map-types';

// Each category has proper OSM tag filters — we query by amenity/shop/tourism/etc,
// NOT by name pattern, so we get every real POI of that type (not just ones whose
// name happens to contain the keyword).
export const CATEGORIES: PlaceCategory[] = [
  {
    id: 'restaurants',
    label: 'Restaurants',
    query: 'restaurant',
    emoji: '🍽️',
    color: '#ea4335',
    overpass: ['amenity=restaurant', 'amenity=fast_food', 'amenity=food_court'],
  },
  {
    id: 'coffee',
    label: 'Coffee',
    query: 'cafe',
    emoji: '☕',
    color: '#a0522d',
    overpass: ['amenity=cafe', 'amenity=ice_cafe', 'shop=coffee'],
  },
  {
    id: 'gas',
    label: 'Gas',
    query: 'gas station',
    emoji: '⛽',
    color: '#5f6368',
    overpass: ['amenity=fuel', 'shop=gas'],
  },
  {
    id: 'hotels',
    label: 'Hotels',
    query: 'hotel',
    emoji: '🏨',
    color: '#1a73e8',
    overpass: ['tourism=hotel', 'tourism=motel', 'tourism=hostel', 'tourism=guest_house', 'tourism=apartment'],
  },
  {
    id: 'groceries',
    label: 'Groceries',
    query: 'supermarket',
    emoji: '🛒',
    color: '#34a853',
    overpass: ['shop=supermarket', 'shop=convenience', 'shop=grocery', 'shop=greengrocer', 'shop=bakery'],
  },
  {
    id: 'pharmacy',
    label: 'Pharmacy',
    query: 'pharmacy',
    emoji: '💊',
    color: '#ea4335',
    overpass: ['amenity=pharmacy', 'amenity=dispensing', 'shop=chemist'],
  },
  {
    id: 'atm',
    label: 'ATMs',
    query: 'atm',
    emoji: '🏧',
    color: '#34a853',
    overpass: ['amenity=atm', 'amenity=bank'],
  },
  {
    id: 'parks',
    label: 'Parks',
    query: 'park',
    emoji: '🌳',
    color: '#34a853',
    overpass: ['leisure=park', 'leisure=garden', 'leisure=playground', 'leisure=nature_reserve', 'landuse=forest'],
  },
  {
    id: 'shopping',
    label: 'Shopping',
    query: 'shopping mall',
    emoji: '🛍️',
    color: '#9c27b0',
    overpass: ['shop=mall', 'shop=clothes', 'shop=shoes', 'shop=jewelry', 'shop=electronics', 'shop=department_store'],
  },
  {
    id: 'hospitals',
    label: 'Hospitals',
    query: 'hospital',
    emoji: '🏥',
    color: '#ea4335',
    overpass: ['amenity=hospital', 'amenity=clinic', 'amenity=doctors', 'healthcare=hospital', 'healthcare=clinic'],
  },
  {
    id: 'transit',
    label: 'Transit',
    query: 'transit station',
    emoji: '🚇',
    color: '#1a73e8',
    overpass: ['public_transport=station', 'railway=station', 'railway=subway_entrance', 'amenity=bus_station', 'highway=bus_stop', 'amenity=ferry_terminal'],
  },
  {
    id: 'gyms',
    label: 'Gyms',
    query: 'gym',
    emoji: '💪',
    color: '#5f6368',
    overpass: ['leisure=fitness_centre', 'leisure=sports_centre', 'leisure=gym'],
  },
];

export function categoryForQuery(query: string): PlaceCategory | undefined {
  return CATEGORIES.find(c => query.toLowerCase().includes(c.query.split(' ')[0]));
}
