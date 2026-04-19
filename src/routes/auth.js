const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const JWT_SECRET = process.env.JWT_SECRET || 'smartfit_secret_2024';

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { nom, email, password, sexe, poids, taille, age } = req.body;
    if (!nom || !email || !password) return res.status(400).json({ error: 'Champs manquants' });
    if (password.length < 6) return res.status(400).json({ error: 'Mot de passe trop court (min 6 caractères)' });

    const existing = await db.get2('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(400).json({ error: 'Email déjà utilisé' });

    const hash = await bcrypt.hash(password, 10);
    const result = await db.run2(
      'INSERT INTO users (nom, email, password, sexe, poids, taille, age) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nom, email, hash, sexe || null, poids || null, taille || null, age || null]
    );

    const token = jwt.sign({ id: result.lastID, email, nom }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: result.lastID, nom, email, avatar: null, sexe, poids, taille, age } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Champs manquants' });

    const user = await db.get2('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(400).json({ error: 'Email ou mot de passe incorrect' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Email ou mot de passe incorrect' });

    const token = jwt.sign({ id: user.id, email: user.email, nom: user.nom }, JWT_SECRET, { expiresIn: '30d' });
    res.json({
      token,
      user: { id: user.id, nom: user.nom, email: user.email, avatar: user.avatar, sexe: user.sexe, poids: user.poids, taille: user.taille, age: user.age, objectif: user.objectif, niveau: user.niveau }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
