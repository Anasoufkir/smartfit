const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db/database');
const auth = require('../middleware/auth');

const UPLOADS_DIR = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${req.user.id}_${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Fichier non supporté'));
  }
});

// GET PROFILE
router.get('/profile', auth, async (req, res) => {
  const user = await db.get2('SELECT id,nom,email,avatar,age,poids,taille,sexe,objectif,niveau,jours,restrictions,created_at FROM users WHERE id=?', [req.user.id]);
  if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
  res.json(user);
});

// UPDATE PROFILE
router.put('/profile', auth, async (req, res) => {
  const { nom, age, poids, taille, sexe, objectif, niveau, jours, restrictions } = req.body;
  await db.run2(`UPDATE users SET nom=?,age=?,poids=?,taille=?,sexe=?,objectif=?,niveau=?,jours=?,restrictions=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [nom, age, poids, taille, sexe, objectif, niveau, jours, restrictions, req.user.id]);
  res.json({ success: true });
});

// UPLOAD AVATAR
router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier' });
  const avatarUrl = `/uploads/${req.file.filename}`;
  await db.run2('UPDATE users SET avatar=? WHERE id=?', [avatarUrl, req.user.id]);
  res.json({ avatar: avatarUrl });
});

// GET STATS
router.get('/stats', auth, async (req, res) => {
  const programmes = await db.get2('SELECT COUNT(*) as count FROM programmes WHERE user_id=?', [req.user.id]);
  const suivi = await db.all2('SELECT * FROM suivi WHERE user_id=? ORDER BY semaine DESC LIMIT 10', [req.user.id]);
  const seances = await db.get2('SELECT COUNT(*) as total, SUM(completee) as faites FROM seances_log WHERE user_id=?', [req.user.id]);
  const lastProgramme = await db.get2('SELECT * FROM programmes WHERE user_id=? ORDER BY created_at DESC LIMIT 1', [req.user.id]);
  res.json({ programmes: programmes.count, suivi, seances, lastProgramme });
});

module.exports = router;

// GET NEARBY GYMS via Google Places API
router.get('/gyms-nearby', async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat/lng manquants' });

  const apiKey = process.env.GOOGLE_PLACES_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Google Places API non configurée', gyms: getMockGyms() });

  try {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=5000&type=gym&key=${apiKey}&language=fr`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return res.json({ gyms: getMockGyms() });
    }

    const gyms = (data.results || []).map(place => {
      const dist = getDistance(parseFloat(lat), parseFloat(lng), place.geometry.location.lat, place.geometry.location.lng);
      let photoUrl = null;
      if (place.photos?.[0]?.photo_reference) {
        photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${apiKey}`;
      }
      return {
        place_id: place.place_id,
        name: place.name,
        vicinity: place.vicinity,
        rating: place.rating,
        user_ratings_total: place.user_ratings_total,
        opening_hours: place.opening_hours,
        photo: photoUrl,
        distance: dist,
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
      };
    }).sort((a, b) => a.distance - b.distance);

    res.json({ gyms });
  } catch(e) {
    console.error('Gyms error:', e);
    res.json({ gyms: getMockGyms() });
  }
});

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2-lat1) * Math.PI/180;
  const dLng = (lng2-lng1) * Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function getMockGyms() {
  return [
    { name: 'Salle de sport locale', vicinity: 'Près de vous', rating: 4.2, user_ratings_total: 128, distance: 500, place_id: '1' },
    { name: 'Fitness Center', vicinity: 'Centre ville', rating: 4.5, user_ratings_total: 89, distance: 1200, place_id: '2' },
  ];
}
