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

function calcTimes(dist) {
  return {
    walkTime: formatTime((dist/1000)/5*60),
    driveTime: formatTime((dist/1000)/30*60 + 2),
    distanceKm: dist < 1000 ? dist + 'm' : (dist/1000).toFixed(1) + 'km'
  };
}

router.get('/', async (req, res) => {
  const { lat, lng, radius } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat/lng manquants' });

  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);
  const searchRadius = parseInt(radius) || 5000;
  const apiKey = process.env.GOOGLE_PLACES_KEY;

  // ── Google Places (si clé disponible) ──
  if (apiKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${userLat},${userLng}&radius=${searchRadius}&type=gym&key=${apiKey}&language=fr`;
      const r = await fetch(url);
      const data = await r.json();

      if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
        const gyms = (data.results || []).map(p => {
          const dist = getDistance(userLat, userLng, p.geometry.location.lat, p.geometry.location.lng);
          let photo = null;
          if (p.photos?.[0]?.photo_reference) {
            photo = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${p.photos[0].photo_reference}&key=${apiKey}`;
          }
          return {
            name: p.name, address: p.vicinity || '',
            rating: p.rating || null, user_ratings_total: p.user_ratings_total || 0,
            opening_hours: p.opening_hours || null, photo,
            lat: p.geometry.location.lat, lng: p.geometry.location.lng,
            distance: dist, ...calcTimes(dist)
          };
        }).sort((a,b) => a.distance - b.distance);
        return res.json({ gyms, source: 'google' });
      }
    } catch(e) {
      console.error('Google Places error:', e.message);
    }
  }

  // ── OpenStreetMap Overpass (fallback) ──
  try {
    const query = `[out:json][timeout:25];
(
  node["leisure"="fitness_centre"](around:${searchRadius},${userLat},${userLng});
  node["leisure"="sports_centre"](around:${searchRadius},${userLat},${userLng});
  node["sport"="fitness"](around:${searchRadius},${userLat},${userLng});
  node["sport"="gym"](around:${searchRadius},${userLat},${userLng});
  node["amenity"="gym"](around:${searchRadius},${userLat},${userLng});
  way["leisure"="fitness_centre"](around:${searchRadius},${userLat},${userLng});
  way["leisure"="sports_centre"](around:${searchRadius},${userLat},${userLng});
  node["name"~"[Gg]ym|[Ff]itness|[Mm]usculation|[Ss]port|[Ss]alle",i](around:${searchRadius},${userLat},${userLng});
);
out center tags;`;

    const r = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(query),
      signal: AbortSignal.timeout(20000)
    });
    const data = await r.json();
    const seen = new Set();
    const gyms = (data.elements || [])
      .filter(el => { if (!el.tags?.name || seen.has(el.tags.name.toLowerCase())) return false; seen.add(el.tags.name.toLowerCase()); return true; })
      .map(el => {
        const glat = el.lat || el.center?.lat;
        const glng = el.lon || el.center?.lon;
        if (!glat || !glng) return null;
        const dist = getDistance(userLat, userLng, glat, glng);
        return { name: el.tags.name, address: [el.tags['addr:street'], el.tags['addr:housenumber'], el.tags['addr:city']].filter(Boolean).join(' ') || '',
          phone: el.tags.phone || null, website: el.tags.website || null,
          opening_hours: el.tags.opening_hours || null,
          lat: glat, lng: glng, distance: dist, ...calcTimes(dist) };
      })
      .filter(Boolean)
      .sort((a,b) => a.distance - b.distance)
      .slice(0, 15);

    res.json({ gyms, source: 'openstreetmap' });
  } catch(e) {
    res.json({ gyms: [], error: 'Erreur de recherche: ' + e.message });
  }
});

module.exports = router;
