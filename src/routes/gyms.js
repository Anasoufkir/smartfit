const express = require('express');
const router = express.Router();

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2-lat1) * Math.PI/180;
  const dLng = (lng2-lng1) * Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

// GET NEARBY GYMS
router.get('/', async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat/lng manquants' });

  const apiKey = process.env.GOOGLE_PLACES_KEY;

  if (!apiKey) {
    // Mode démo sans API key
    return res.json({ gyms: getDemoGyms(parseFloat(lat), parseFloat(lng)), demo: true });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=5000&type=gym&key=${apiKey}&language=fr&rankby=prominence`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places error:', data.status, data.error_message);
      return res.json({ gyms: getDemoGyms(parseFloat(lat), parseFloat(lng)), demo: true });
    }

    const gyms = (data.results || []).slice(0, 10).map(place => {
      const dist = getDistance(parseFloat(lat), parseFloat(lng),
        place.geometry.location.lat, place.geometry.location.lng);
      let photoUrl = null;
      if (place.photos?.[0]?.photo_reference) {
        photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${apiKey}`;
      }
      return {
        place_id: place.place_id,
        name: place.name,
        vicinity: place.vicinity,
        rating: place.rating || null,
        user_ratings_total: place.user_ratings_total || 0,
        opening_hours: place.opening_hours || null,
        photo: photoUrl,
        distance: dist,
      };
    }).sort((a, b) => a.distance - b.distance);

    res.json({ gyms });
  } catch(e) {
    console.error('Gyms fetch error:', e);
    res.json({ gyms: getDemoGyms(parseFloat(lat), parseFloat(lng)), demo: true });
  }
});

function getDemoGyms(lat, lng) {
  return [
    { place_id: '1', name: 'Basic-Fit', vicinity: '200m de vous', rating: 4.1, user_ratings_total: 312, distance: 200, opening_hours: { open_now: true } },
    { place_id: '2', name: 'Fitness Park', vicinity: '500m de vous', rating: 4.3, user_ratings_total: 187, distance: 500, opening_hours: { open_now: true } },
    { place_id: '3', name: 'KeepCool', vicinity: '1.2km de vous', rating: 4.0, user_ratings_total: 95, distance: 1200, opening_hours: { open_now: false } },
    { place_id: '4', name: 'Salle de Sport Locale', vicinity: '2km de vous', rating: 4.5, user_ratings_total: 56, distance: 2000, opening_hours: { open_now: true } },
  ];
}

module.exports = router;
