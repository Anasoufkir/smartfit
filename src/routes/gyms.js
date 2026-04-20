const express = require('express');
const router = express.Router();

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2-lat1) * Math.PI/180;
  const dLng = (lng2-lng1) * Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

function formatTime(minutes) {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes/60);
  const m = Math.round(minutes%60);
  return m > 0 ? `${h}h${m.toString().padStart(2,'0')}` : `${h}h`;
}

router.get('/', async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat/lng manquants' });

  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);
  const radius = 8000; // 8km pour le Maroc

  try {
    // Requête Overpass élargie — tous les types de salles de sport
    const query = `[out:json][timeout:25];
(
  node["leisure"="fitness_centre"](around:${radius},${userLat},${userLng});
  node["leisure"="sports_centre"](around:${radius},${userLat},${userLng});
  node["sport"="fitness"](around:${radius},${userLat},${userLng});
  node["sport"="gym"](around:${radius},${userLat},${userLng});
  node["amenity"="gym"](around:${radius},${userLat},${userLng});
  node["amenity"="sports_centre"](around:${radius},${userLat},${userLng});
  way["leisure"="fitness_centre"](around:${radius},${userLat},${userLng});
  way["leisure"="sports_centre"](around:${radius},${userLat},${userLng});
  way["sport"="fitness"](around:${radius},${userLat},${userLng});
  way["sport"="gym"](around:${radius},${userLat},${userLng});
  node["name"~"[Gg]ym|[Ff]itness|[Mm]usculation|[Ss]port|[Ss]alle",i]["amenity"!="restaurant"](around:${radius},${userLat},${userLng});
);
out center tags;`;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(query),
      signal: AbortSignal.timeout(20000)
    });

    if (!response.ok) throw new Error('Overpass error: ' + response.status);
    const data = await response.json();

    const seen = new Set();
    const gyms = (data.elements || [])
      .filter(el => {
        const name = el.tags?.name;
        if (!name) return false;
        if (seen.has(name.toLowerCase())) return false;
        seen.add(name.toLowerCase());
        return true;
      })
      .map(el => {
        const glat = el.lat || el.center?.lat;
        const glng = el.lon || el.center?.lon;
        if (!glat || !glng) return null;
        const dist = getDistance(userLat, userLng, glat, glng);
        const walkMin = (dist / 1000) / 5 * 60;
        const driveMin = (dist / 1000) / 30 * 60 + 2;
        return {
          id: el.id,
          name: el.tags.name,
          address: [el.tags['addr:street'], el.tags['addr:housenumber'], el.tags['addr:city']]
            .filter(Boolean).join(' ') || el.tags['addr:full'] || '',
          phone: el.tags.phone || el.tags['contact:phone'] || null,
          website: el.tags.website || el.tags['contact:website'] || null,
          opening_hours: el.tags.opening_hours || null,
          lat: glat, lng: glng,
          distance: dist,
          walkTime: formatTime(walkMin),
          driveTime: formatTime(driveMin),
          distanceKm: dist < 1000 ? dist + 'm' : (dist/1000).toFixed(1) + 'km',
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 15);

    // Si aucun résultat, chercher via Nominatim (geocoding)
    if (gyms.length === 0) {
      return res.json({ gyms: [], message: 'Aucune salle trouvée dans OpenStreetMap pour cette zone.' });
    }

    res.json({ gyms });
  } catch(e) {
    console.error('Gyms error:', e.message);
    res.json({ gyms: [], error: e.message });
  }
});

module.exports = router;
