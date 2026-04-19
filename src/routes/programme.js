const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const db = require('../db/database');
const auth = require('../middleware/auth');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// YouTube video IDs for exercises
const YOUTUBE_VIDEOS = {
  'développé couché': 'vcBig73ojpE',
  'bench press': 'vcBig73ojpE',
  'développé incliné': '8iPEnn-ltC8',
  'développé militaire': 'qEwKCR5JCog',
  'élévations latérales': '3VcKaXpzqRo',
  'curl biceps': 'kwG2ipFRgfo',
  'curl marteau': 'zC3nLlEvin4',
  'tirage vertical': 'CAwf7n6Luuc',
  'lat pulldown': 'CAwf7n6Luuc',
  'rowing assis': 'GZbfZ033f74',
  'extension triceps': '2-LAMcpzODU',
  'squat': 'U3HlEF_E9fo',
  'presse à cuisses': 'IZxyjW7MPJQ',
  'leg press': 'IZxyjW7MPJQ',
  'leg extension': 'YyvSfVjQeL0',
  'leg curl': '1Tq3QdYUuHs',
  'mollets': 'gwLzBJYoWlI',
  'soulevé de terre': 'op9kVnSso6Q',
  'deadlift': 'op9kVnSso6Q',
  'planche': 'pSHjTRCQxIw',
  'plank': 'pSHjTRCQxIw',
  'dips': 'yTMGMmVkLMo',
  'tractions': 'eGo4IYlbE5g',
  'pull up': 'eGo4IYlbE5g',
  'fentes': 'QOVaHwm-Q6U',
  'lunges': 'QOVaHwm-Q6U',
  'rowing barre': 'T3N-TO4reLQ',
  'hip thrust': 'SEdqd1n0cvg',
  'gainage': 'pSHjTRCQxIw',
};

function getYoutubeId(exerciseName) {
  const name = exerciseName.toLowerCase();
  for (const [key, id] of Object.entries(YOUTUBE_VIDEOS)) {
    if (name.includes(key)) return id;
  }
  return 'dQw4w9WgXcQ';
}

// GENERATE PROGRAMME
router.post('/generate', auth, async (req, res) => {
  const { nom, age, poids, taille, sexe, objectif, niveau, jours, restrictions } = req.body;

  const imc = (poids / ((taille / 100) ** 2)).toFixed(1);
  const bmr = sexe === 'homme'
    ? Math.round(88.36 + (13.4 * poids) + (4.8 * taille) - (5.7 * age))
    : Math.round(447.6 + (9.2 * poids) + (3.1 * taille) - (4.3 * age));
  const mult = { sedentaire: 1.2, leger: 1.375, modere: 1.55, intense: 1.725 };
  const tdee = Math.round(bmr * (mult[jours] || 1.55));
  const calObj = objectif === 'perte' ? tdee - 400 : objectif === 'masse' ? tdee + 300 : tdee;
  const nbSeances = jours === 'sedentaire' ? 2 : jours === 'leger' ? 3 : jours === 'modere' ? 4 : 5;

  const prompt = `Tu es un coach sportif et nutritionniste expert. Génère un programme complet en JSON UNIQUEMENT (pas de markdown).

Profil: ${nom}, ${age} ans, ${poids}kg, ${taille}cm, ${sexe}, IMC:${imc}
Objectif: ${objectif} | Niveau: ${niveau} | ${nbSeances} séances/semaine
Restrictions: ${restrictions || 'aucune'}
Calories objectif: ${calObj} kcal | TDEE: ${tdee} kcal

Retourne UNIQUEMENT ce JSON:
{
  "resume": {
    "calories": ${calObj},
    "proteines": 0,
    "glucides": 0,
    "lipides": 0,
    "imc": "${imc}",
    "imcStatut": "",
    "message": "message motivant personnalisé"
  },
  "nutrition": {
    "repas": [
      {
        "nom": "Petit-déjeuner",
        "heure": "07h00",
        "aliments": ["200g flocons d'avoine", "3 oeufs brouillés", "1 banane"],
        "calories": 0,
        "proteines": 0,
        "glucides": 0,
        "lipides": 0
      }
    ],
    "alimentsAutorise": ["8 aliments recommandés"],
    "alimentsInterdits": ["6 aliments à éviter"]
  },
  "entrainement": {
    "seances": [
      {
        "jour": "Lundi",
        "type": "Push",
        "exercices": [
          {
            "nom": "Développé couché",
            "series": 4,
            "repetitions": "8-10",
            "repos": "90 sec",
            "muscle": "Pectoraux",
            "conseil": "Garde les coudes à 45 degrés"
          }
        ]
      }
    ]
  },
  "conseils": ["conseil 1", "conseil 2", "conseil 3", "conseil 4", "conseil 5"]
}

Calcule les vrais macros. Génère exactement ${nbSeances} séances adaptées au niveau ${niveau}. Inclus 6 repas.`;

  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullText = '';
    const stream = await client.messages.stream({
      model: 'claude-opus-4-5',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        fullText += chunk.delta.text;
        res.write(`data: ${JSON.stringify({ chunk: chunk.delta.text })}\n\n`);
      }
    }

    // Parse and add YouTube videos
    try {
      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        data.entrainement.seances.forEach(s => {
          s.exercices.forEach(e => {
            e.youtubeId = getYoutubeId(e.nom);
          });
        });

        // Save to DB
        const semaine = db.prepare('SELECT COUNT(*) as count FROM programmes WHERE user_id=?').get(req.user.id).count + 1;
        db.prepare('INSERT INTO programmes (user_id, semaine, data) VALUES (?,?,?)').run(req.user.id, semaine, JSON.stringify(data));

        // Update user profile
        db.prepare('UPDATE users SET age=?,poids=?,taille=?,sexe=?,objectif=?,niveau=?,jours=?,restrictions=? WHERE id=?')
          .run(age, poids, taille, sexe, objectif, niveau, jours, restrictions, req.user.id);

        // Init suivi for this week
        const existingSuivi = db.prepare('SELECT id FROM suivi WHERE user_id=? AND semaine=?').get(req.user.id, semaine);
        if (!existingSuivi) {
          db.prepare('INSERT INTO suivi (user_id, semaine, poids, seances_total) VALUES (?,?,?,?)').run(req.user.id, semaine, poids, data.entrainement.seances.length);
        }

        res.write(`data: ${JSON.stringify({ done: true, programme: data, semaine })}\n\n`);
      }
    } catch (parseErr) {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    }

    res.end();
  } catch (err) {
    console.error('Error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Erreur génération' });
  }
});

// GET ALL PROGRAMMES
router.get('/', auth, (req, res) => {
  const programmes = db.prepare('SELECT id, semaine, created_at FROM programmes WHERE user_id=? ORDER BY semaine DESC').all(req.user.id);
  res.json(programmes);
});

// GET SPECIFIC PROGRAMME
router.get('/:id', auth, (req, res) => {
  const prog = db.prepare('SELECT * FROM programmes WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!prog) return res.status(404).json({ error: 'Programme non trouvé' });
  prog.data = JSON.parse(prog.data);
  res.json(prog);
});

// GET LATEST PROGRAMME
router.get('/latest/current', auth, (req, res) => {
  const prog = db.prepare('SELECT * FROM programmes WHERE user_id=? ORDER BY created_at DESC LIMIT 1').get(req.user.id);
  if (!prog) return res.status(404).json({ error: 'Aucun programme' });
  prog.data = JSON.parse(prog.data);
  res.json(prog);
});

// UPDATE SUIVI HEBDO
router.post('/suivi', auth, (req, res) => {
  const { semaine, poids, calories_avg, seances_faites, notes } = req.body;
  const existing = db.prepare('SELECT id FROM suivi WHERE user_id=? AND semaine=?').get(req.user.id, semaine);
  if (existing) {
    db.prepare('UPDATE suivi SET poids=?,calories_avg=?,seances_faites=?,notes=? WHERE user_id=? AND semaine=?')
      .run(poids, calories_avg, seances_faites, notes, req.user.id, semaine);
  } else {
    db.prepare('INSERT INTO suivi (user_id,semaine,poids,calories_avg,seances_faites,notes) VALUES (?,?,?,?,?,?)')
      .run(req.user.id, semaine, poids, calories_avg, seances_faites, notes);
  }
  res.json({ success: true });
});

// LOG SEANCE COMPLETEE
router.post('/seance-log', auth, (req, res) => {
  const { semaine, jour, type_seance, completee } = req.body;
  const existing = db.prepare('SELECT id FROM seances_log WHERE user_id=? AND semaine=? AND jour=?').get(req.user.id, semaine, jour);
  if (existing) {
    db.prepare('UPDATE seances_log SET completee=? WHERE id=?').run(completee ? 1 : 0, existing.id);
  } else {
    db.prepare('INSERT INTO seances_log (user_id,semaine,jour,type_seance,completee) VALUES (?,?,?,?,?)').run(req.user.id, semaine, jour, type_seance, completee ? 1 : 0);
  }
  res.json({ success: true });
});

// GET SUIVI HISTORY
router.get('/suivi/history', auth, (req, res) => {
  const suivi = db.prepare('SELECT * FROM suivi WHERE user_id=? ORDER BY semaine ASC').all(req.user.id);
  const seances = db.prepare('SELECT * FROM seances_log WHERE user_id=? ORDER BY semaine ASC').all(req.user.id);
  res.json({ suivi, seances });
});

module.exports = router;
