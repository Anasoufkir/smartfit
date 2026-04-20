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

  // ── Google Places New API ──
  if (apiKey) {
    try {
      const body = JSON.stringify({
        includedTypes: ['gym', 'fitness_center', 'sports_complex'],
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: { latitude: userLat, longitude: userLng },
            radius: searchRadius
          }
        }
      });

      const r = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.currentOpeningHours,places.location,places.websiteUri,places.internationalPhoneNumber'
        },
        body,
        signal: AbortSignal.timeout(10000)
      });

      const data = await r.json();
      if (data.places && data.places.length > 0) {
        const gyms = data.places.map(p => {
          const glat = p.location?.latitude;
          const glng = p.location?.longitude;
          const dist = getDistance(userLat, userLng, glat, glng);
          return {
            name: p.displayName?.text || 'Salle de sport',
            address: p.formattedAddress || '',
            rating: p.rating || null,
            user_ratings_total: p.userRatingCount || 0,
            opening_hours: p.currentOpeningHours?.openNow !== undefined
              ? { open_now: p.currentOpeningHours.openNow }
              : null,
            website: p.websiteUri || null,
            phone: p.internationalPhoneNumber || null,
            lat: glat, lng: glng,
            distance: dist, ...calcTimes(dist)
          };
        }).sort((a,b) => a.distance - b.distance);
        return res.json({ gyms, source: 'google' });
      }
    } catch(e) {
      console.error('Google Places New error:', e.message);
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
