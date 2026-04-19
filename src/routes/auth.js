const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'smartfit_secret_2024';

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { nom, email, password } = req.body;
    if (!nom || !email || !password) return res.status(400).json({ error: 'Champs manquants' });
    if (password.length < 6) return res.status(400).json({ error: 'Mot de passe trop court (min 6 caractères)' });

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(400).json({ error: 'Email déjà utilisé' });

    const hash = await bcrypt.hash(password, 10);
    const result = db.prepare('INSERT INTO users (nom, email, password) VALUES (?, ?, ?)').run(nom, email, hash);

    const token = jwt.sign({ id: result.lastInsertRowid, email, nom }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: result.lastInsertRowid, nom, email, avatar: null } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Champs manquants' });

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(400).json({ error: 'Email ou mot de passe incorrect' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Email ou mot de passe incorrect' });

    const token = jwt.sign({ id: user.id, email: user.email, nom: user.nom }, JWT_SECRET, { expiresIn: '30d' });
    res.json({
      token,
      user: { id: user.id, nom: user.nom, email: user.email, avatar: user.avatar, objectif: user.objectif, niveau: user.niveau }
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
