const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const db = require('../db/database');
const auth = require('../middleware/auth');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// YouTube video IDs for exercises
// IDs IMZA WORKOUT — https://www.youtube.com/@IMZAWORKOUT95/shorts
const IMZA = {
  triceps:  'HqnRinSg00E',
  biceps:   'I-mDjL5IIo4',
  jambes:   'Ui-vUPt5zPw',
  poitrine: 'KYjiO7OIpuQ',
  dos:      'mZ-TjumYJ_w',
  abdos:    'N8NMGPuNerw',
};

const YOUTUBE_VIDEOS_HOMME = [
  // POITRINE
  { keys: ['développé couché', 'bench press', 'développé plat', 'chest press', 'développé haltères', 'développé incliné', 'incline press', 'écarté', 'fly', 'pec deck', 'butterfly', 'câble croisé', 'chest fly', 'pompe', 'push up', 'push-up', 'flexion bras', 'poitrine'], id: IMZA.poitrine },
  // TRICEPS
  { keys: ['triceps', 'extension triceps', 'triceps poulie', 'pushdown', 'push down', 'corde triceps', 'skull crusher', 'barre front', 'extension nuque', 'french press', 'dips', 'kickback', 'barre parallèle'], id: IMZA.triceps },
  // BICEPS
  { keys: ['biceps', 'curl', 'curl barre', 'curl haltères', 'curl alternés', 'curl marteau', 'hammer curl', 'curl concentré', 'curl câble', 'bayesian curl', 'barbell curl', 'bras'], id: IMZA.biceps },
  // DOS
  { keys: ['dos', 'tirage', 'rowing', 'traction', 'pull up', 'pull-up', 'chin up', 'lat pulldown', 'tirage vertical', 'tirage horizontal', 'tirage nuque', 'tirage poitrine', 'rowing assis', 'rowing câble', 'rowing barre', 'rowing haltère', 'rowing un bras', 'soulevé de terre', 'deadlift', 'pullover', 'pull over', 'hyperextension', 'extension lombaire', 'dorsaux', 'grand dorsal'], id: IMZA.dos },
  // JAMBES
  { keys: ['jambes', 'squat', 'presse', 'leg press', 'leg extension', 'leg curl', 'fente', 'lunge', 'mollet', 'calf', 'hip thrust', 'goblet', 'quadriceps', 'ischio', 'hamstring', 'fessier', 'glute', 'bulgare', 'split squat', 'sumo'], id: IMZA.jambes },
  // ABDOS
  { keys: ['abdos', 'abdominal', 'planche', 'plank', 'gainage', 'crunch', 'sit up', 'russian twist', 'rotation tronc', 'relevé jambes', 'leg raise', 'mountain climber', 'grimpeur', 'core', 'ventre'], id: IMZA.abdos },
];

const YOUTUBE_VIDEOS_FEMME = [
  // POITRINE
  { keys: ['développé couché', 'bench press', 'développé plat', 'chest press', 'développé haltères', 'développé incliné', 'incline press', 'écarté', 'fly', 'pec deck', 'butterfly', 'câble croisé', 'chest fly', 'pompe', 'push up', 'push-up', 'flexion bras', 'poitrine'], id: IMZA.poitrine },
  // TRICEPS
  { keys: ['triceps', 'extension triceps', 'triceps poulie', 'pushdown', 'push down', 'corde triceps', 'skull crusher', 'barre front', 'extension nuque', 'french press', 'dips', 'kickback', 'barre parallèle'], id: IMZA.triceps },
  // BICEPS
  { keys: ['biceps', 'curl', 'curl barre', 'curl haltères', 'curl alternés', 'curl marteau', 'hammer curl', 'curl concentré', 'curl câble', 'bayesian curl', 'barbell curl', 'bras'], id: IMZA.biceps },
  // DOS
  { keys: ['dos', 'tirage', 'rowing', 'traction', 'pull up', 'pull-up', 'chin up', 'lat pulldown', 'tirage vertical', 'tirage horizontal', 'tirage nuque', 'tirage poitrine', 'rowing assis', 'rowing câble', 'rowing barre', 'rowing haltère', 'rowing un bras', 'soulevé de terre', 'deadlift', 'pullover', 'pull over', 'hyperextension', 'extension lombaire', 'dorsaux', 'grand dorsal'], id: IMZA.dos },
  // JAMBES / FESSIERS
  { keys: ['jambes', 'squat', 'presse', 'leg press', 'leg extension', 'leg curl', 'fente', 'lunge', 'mollet', 'calf', 'hip thrust', 'goblet', 'quadriceps', 'ischio', 'hamstring', 'fessier', 'glute', 'bulgare', 'split squat', 'sumo', 'donkey kick', 'fire hydrant', 'kickback fessier', 'abduction', 'step up'], id: IMZA.jambes },
  // ABDOS
  { keys: ['abdos', 'abdominal', 'planche', 'plank', 'gainage', 'crunch', 'sit up', 'russian twist', 'rotation tronc', 'relevé jambes', 'leg raise', 'mountain climber', 'grimpeur', 'core', 'ventre'], id: IMZA.abdos },
];

function getYoutubeId(exerciseName, sexe) {
  const name = exerciseName.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const videoList = (sexe === 'femme') ? YOUTUBE_VIDEOS_FEMME : YOUTUBE_VIDEOS_HOMME;

  for (const entry of videoList) {
    for (const key of entry.keys) {
      const normalizedKey = key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (name.includes(normalizedKey) || normalizedKey.includes(name)) {
        return entry.id;
      }
    }
  }

  // Word-by-word fallback
  const words = name.split(' ').filter(w => w.length > 3);
  for (const entry of videoList) {
    for (const key of entry.keys) {
      const normalizedKey = key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      for (const word of words) {
        if (normalizedKey.includes(word)) return entry.id;
      }
    }
  }

  return null;
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
            e.youtubeId = getYoutubeId(e.nom, sexe);
          });
        });

        // Save to DB
        const countRow = await db.get2('SELECT COUNT(*) as count FROM programmes WHERE user_id=?', [req.user.id]);
        const semaine = countRow.count + 1;
        await db.run2('INSERT INTO programmes (user_id, semaine, data) VALUES (?,?,?)', [req.user.id, semaine, JSON.stringify(data)]);

        // Update user profile
        await db.run2('UPDATE users SET age=?,poids=?,taille=?,sexe=?,objectif=?,niveau=?,jours=?,restrictions=? WHERE id=?',
          [age, poids, taille, sexe, objectif, niveau, jours, restrictions, req.user.id]);

        // Init suivi for this week
        const existingSuivi = await db.get2('SELECT id FROM suivi WHERE user_id=? AND semaine=?', [req.user.id, semaine]);
        if (!existingSuivi) {
          await db.run2('INSERT INTO suivi (user_id, semaine, poids, seances_total) VALUES (?,?,?,?)',
            [req.user.id, semaine, poids, data.entrainement.seances.length]);
        }

        res.write(`data: ${JSON.stringify({ done: true, programme: data, semaine })}\n\n`);
      } else {
        console.error('No JSON found in response');
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      }
    } catch (parseErr) {
      console.error('Parse/DB error:', parseErr);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    }

    res.end();
  } catch (err) {
    console.error('Error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Erreur génération' });
  }
});

// GET ALL PROGRAMMES
router.get('/', auth, async (req, res) => {
  const programmes = await db.all2('SELECT id, semaine, created_at FROM programmes WHERE user_id=? ORDER BY semaine DESC', [req.user.id]);
  res.json(programmes);
});

// GET SPECIFIC PROGRAMME
router.get('/:id', auth, async (req, res) => {
  const prog = await db.get2('SELECT * FROM programmes WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  if (!prog) return res.status(404).json({ error: 'Programme non trouvé' });
  prog.data = JSON.parse(prog.data);
  res.json(prog);
});

// GET LATEST PROGRAMME
router.get('/latest/current', auth, async (req, res) => {
  const prog = await db.get2('SELECT * FROM programmes WHERE user_id=? ORDER BY created_at DESC LIMIT 1', [req.user.id]);
  if (!prog) return res.status(404).json({ error: 'Aucun programme' });
  prog.data = JSON.parse(prog.data);
  res.json(prog);
});

// UPDATE SUIVI HEBDO
router.post('/suivi', auth, async (req, res) => {
  const { semaine, poids, calories_avg, seances_faites, notes } = req.body;
  const existing = await db.get2('SELECT id FROM suivi WHERE user_id=? AND semaine=?', [req.user.id, semaine]);
  if (existing) {
    await db.run2('UPDATE suivi SET poids=?,calories_avg=?,seances_faites=?,notes=? WHERE user_id=? AND semaine=?',
      [poids, calories_avg, seances_faites, notes, req.user.id, semaine]);
  } else {
    await db.run2('INSERT INTO suivi (user_id,semaine,poids,calories_avg,seances_faites,notes) VALUES (?,?,?,?,?,?)',
      [req.user.id, semaine, poids, calories_avg, seances_faites, notes]);
  }
  res.json({ success: true });
});

// LOG SEANCE COMPLETEE
router.post('/seance-log', auth, async (req, res) => {
  const { semaine, jour, type_seance, completee } = req.body;
  const existing = await db.get2('SELECT id FROM seances_log WHERE user_id=? AND semaine=? AND jour=?', [req.user.id, semaine, jour]);
  if (existing) {
    await db.run2('UPDATE seances_log SET completee=? WHERE id=?', [completee ? 1 : 0, existing.id]);
  } else {
    await db.run2('INSERT INTO seances_log (user_id,semaine,jour,type_seance,completee) VALUES (?,?,?,?,?)',
      [req.user.id, semaine, jour, type_seance, completee ? 1 : 0]);
  }
  res.json({ success: true });
});

// GET SUIVI HISTORY
router.get('/suivi/history', auth, async (req, res) => {
  const suivi = await db.all2('SELECT * FROM suivi WHERE user_id=? ORDER BY semaine ASC', [req.user.id]);
  const seances = await db.all2('SELECT * FROM seances_log WHERE user_id=? ORDER BY semaine ASC', [req.user.id]);
  res.json({ suivi, seances });
});

module.exports = router;
