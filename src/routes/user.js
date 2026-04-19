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
