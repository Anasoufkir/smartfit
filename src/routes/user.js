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
router.get('/profile', auth, (req, res) => {
  const user = db.prepare('SELECT id,nom,email,avatar,age,poids,taille,sexe,objectif,niveau,jours,restrictions,created_at FROM users WHERE id=?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
  res.json(user);
});

// UPDATE PROFILE
router.put('/profile', auth, (req, res) => {
  const { nom, age, poids, taille, sexe, objectif, niveau, jours, restrictions } = req.body;
  db.prepare(`UPDATE users SET nom=?,age=?,poids=?,taille=?,sexe=?,objectif=?,niveau=?,jours=?,restrictions=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(nom, age, poids, taille, sexe, objectif, niveau, jours, restrictions, req.user.id);
  res.json({ success: true });
});

// UPLOAD AVATAR
router.post('/avatar', auth, upload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier' });
  const avatarUrl = `/uploads/${req.file.filename}`;
  db.prepare('UPDATE users SET avatar=? WHERE id=?').run(avatarUrl, req.user.id);
  res.json({ avatar: avatarUrl });
});

// GET STATS
router.get('/stats', auth, (req, res) => {
  const programmes = db.prepare('SELECT COUNT(*) as count FROM programmes WHERE user_id=?').get(req.user.id);
  const suivi = db.prepare('SELECT * FROM suivi WHERE user_id=? ORDER BY semaine DESC LIMIT 10').all(req.user.id);
  const seances = db.prepare('SELECT COUNT(*) as total, SUM(completee) as faites FROM seances_log WHERE user_id=?').get(req.user.id);
  const lastProgramme = db.prepare('SELECT * FROM programmes WHERE user_id=? ORDER BY created_at DESC LIMIT 1').get(req.user.id);
  res.json({ programmes: programmes.count, suivi, seances, lastProgramme });
});

module.exports = router;
