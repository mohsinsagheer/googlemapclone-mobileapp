const url = 'https://router.project-osrm.org/route/v1/driving/-73.9851,40.7589;-74.0445,40.6892?overview=full&geometries=geojson&steps=true';
console.log('Fetching:', url);
fetch(url, {
  headers: { 'User-Agent': 'GoogleMapsClone/1.0 (z.ai-sandbox)' },
})
  .then(r => {
    console.log('Status:', r.status);
    return r.json();
  })
  .then(d => {
    console.log('Code:', d.code);
    if (d.routes) {
      console.log('Routes count:', d.routes.length);
      console.log('First route distance:', d.routes[0].distance);
    } else {
      console.log('Body:', JSON.stringify(d).slice(0, 300));
    }
  })
  .catch(e => console.error('Error:', e.message));
