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

// GET NEARBY GYMS via OpenStreetMap Overpass API (free, no key needed)
router.get('/', async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat/lng manquants' });

  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);
  const radius = 5000; // 5km

  try {
    // Overpass API query — find gyms, fitness centers, sports clubs
    const query = `
      [out:json][timeout:15];
      (
        node["leisure"="fitness_centre"](around:${radius},${userLat},${userLng});
        node["sport"="fitness"](around:${radius},${userLat},${userLng});
        node["amenity"="gym"](around:${radius},${userLat},${userLng});
        way["leisure"="fitness_centre"](around:${radius},${userLat},${userLng});
        way["sport"="fitness"](around:${radius},${userLat},${userLng});
      );
      out center tags;
    `;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(query),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) throw new Error('Overpass API error');
    const data = await response.json();

    const gyms = (data.elements || [])
      .filter(el => el.tags?.name)
      .map(el => {
        const glat = el.lat || el.center?.lat;
        const glng = el.lon || el.center?.lon;
        const dist = getDistance(userLat, userLng, glat, glng);
        
        // Walking: 5 km/h average
        const walkMin = (dist / 1000) / 5 * 60;
        // Driving: 30 km/h in city average  
        const driveMin = (dist / 1000) / 30 * 60 + 2; // +2 min parking

        return {
          id: el.id,
          name: el.tags.name,
          address: [el.tags['addr:street'], el.tags['addr:housenumber'], el.tags['addr:city']]
            .filter(Boolean).join(' ') || el.tags['addr:full'] || '',
          phone: el.tags.phone || el.tags['contact:phone'] || null,
          website: el.tags.website || el.tags['contact:website'] || null,
          opening_hours: el.tags.opening_hours || null,
          lat: glat,
          lng: glng,
          distance: dist,
          walkTime: formatTime(walkMin),
          driveTime: formatTime(driveMin),
          distanceKm: dist < 1000 ? dist + 'm' : (dist/1000).toFixed(1) + 'km',
          mapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${glat},${glng}&travelmode=walking`
        };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 12);

    res.json({ gyms, source: 'openstreetmap' });

  } catch(e) {
    console.error('Gyms error:', e.message);
    // Return empty with error message
    res.json({ gyms: [], error: 'Impossible de charger les salles. Réessaie.' });
  }
});

module.exports = router;
