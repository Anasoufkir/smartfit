const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const JWT_SECRET = process.env.JWT_SECRET || 'smartfit_secret_2024';

// Google OAuth - redirect to Google
router.get('/google', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.redirect('/?error=google_not_configured');
  
  const redirectUri = `${process.env.APP_URL || 'https://fit.anasoufkir.com'}/api/auth/google/callback`;
  const scope = 'openid email profile';
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline`;
  res.redirect(url);
});

// Google OAuth callback
router.get('/google/callback', async (req, res) => {
  const { code, error } = req.query;
  
  if (error || !code) {
    return res.redirect('/?error=google_cancelled');
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.APP_URL || 'https://fit.anasoufkir.com'}/api/auth/google/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' })
    });
    const tokens = await tokenRes.json();
    if (!tokens.access_token) throw new Error('No access token');

    // Get user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const googleUser = await userRes.json();
    const { email, name, picture, sub: googleId } = googleUser;

    // Check if user exists
    let user = await db.get2('SELECT * FROM users WHERE email=?', [email]);

    if (!user) {
      // Create new user
      const result = await db.run2(
        'INSERT INTO users (nom, email, password, avatar, google_id) VALUES (?,?,?,?,?)',
        [name, email, 'GOOGLE_AUTH_' + googleId, picture, googleId]
      );
      user = await db.get2('SELECT * FROM users WHERE id=?', [result.lastID]);
    } else if (!user.google_id) {
      // Link Google to existing account
      await db.run2('UPDATE users SET google_id=?, avatar=COALESCE(avatar,?) WHERE id=?', [googleId, picture, user.id]);
    }

    // Generate JWT
    const token = jwt.sign({ id: user.id, email: user.email, nom: user.nom }, JWT_SECRET, { expiresIn: '30d' });
    
    // Redirect to app with token
    res.redirect(`/?google_token=${token}&google_user=${encodeURIComponent(JSON.stringify({
      id: user.id, nom: user.nom, email: user.email, avatar: user.avatar || picture,
      sexe: user.sexe, poids: user.poids, taille: user.taille, age: user.age
    }))}`);

  } catch(e) {
    console.error('Google OAuth error:', e);
    res.redirect('/?error=google_failed');
  }
});

module.exports = router;
