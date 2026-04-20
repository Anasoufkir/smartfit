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
  const { nom, age, poids, taille, sexe, objectif, niveau, jours, restrictions, supplements, morphotype, poidsActuel, poidsObjectif } = req.body;

  const imc = (poids / ((taille / 100) ** 2)).toFixed(1);
  const bmr = sexe === 'homme'
    ? Math.round(88.36 + (13.4 * poids) + (4.8 * taille) - (5.7 * age))
    : Math.round(447.6 + (9.2 * poids) + (3.1 * taille) - (4.3 * age));
  const mult = { sedentaire: 1.2, leger: 1.375, modere: 1.55, intense: 1.725 };
  const tdee = Math.round(bmr * (mult[jours] || 1.55));
  const calObj = objectif === 'perte' ? tdee - 400 : objectif === 'masse' ? tdee + 300 : tdee;
  const nbSeances = jours === 'sedentaire' ? 2 : jours === 'leger' ? 3 : jours === 'modere' ? 4 : 5;

  const suppText = supplements && supplements.length > 0
    ? `Suppléments utilisés: ${supplements.join(', ')}. Intègre les conseils de timing et dosage dans la nutrition.`
    : 'Aucun supplément.';

  const morphText = morphotype ? `Morphotype: ${morphotype}.` : '';

  const prompt = `Tu es un coach sportif et nutritionniste expert. Génère un programme complet sur 6 semaines en JSON UNIQUEMENT (pas de markdown, pas de texte avant ou après).

Profil: ${nom}, ${age} ans, ${poids}kg, ${taille}cm, ${sexe}, IMC:${imc}
Objectif: ${objectif} | Niveau: ${niveau} | ${nbSeances} séances/semaine
${morphText}
Restrictions alimentaires: ${restrictions || 'aucune'}
${suppText}
Calories objectif: ${calObj} kcal | TDEE: ${tdee} kcal

Retourne UNIQUEMENT ce JSON valide:
{
  "resume": {
    "calories": ${calObj},
    "proteines": 0,
    "glucides": 0,
    "lipides": 0,
    "imc": "${imc}",
    "imcStatut": "Normal/Surpoids/etc",
    "message": "message motivant personnalisé 2-3 phrases",
    "supplements": [{"nom": "Whey", "dose": "30g", "timing": "Post-entraînement", "conseil": "conseil spécifique"}]
  },
  "nutrition": {
    "repas": [
      {
        "nom": "Petit-déjeuner",
        "heure": "07h00",
        "aliments": ["200g flocons d'avoine", "3 oeufs", "1 banane"],
        "calories": 0,
        "proteines": 0,
        "glucides": 0,
        "lipides": 0
      }
    ],
    "alimentsAutorise": ["8 aliments recommandés"],
    "alimentsInterdits": ["6 aliments à éviter"]
  },
  "programme6semaines": [
    {
      "semaine": 1,
      "phase": "Adaptation",
      "objectif": "Maîtriser les mouvements avec charges légères",
      "seances": [
        {
          "jour": "Lundi",
          "type": "Push",
          "exercices": [
            {
              "nom": "Développé couché",
              "series": 3,
              "repetitions": "12-15",
              "repos": "90 sec",
              "muscle": "Pectoraux",
              "conseil": "Coudes à 45°, descente contrôlée sur 3 secondes",
              "securite": "⚠️ Ne jamais verrouiller les coudes en haut. Utilise un spotter pour les charges lourdes.",
              "echauffement": "10 pompes légères + rotations épaules avant de commencer"
            }
          ]
        }
      ]
    },
    {
      "semaine": 2,
      "phase": "Adaptation",
      "objectif": "Augmenter légèrement les charges (+2.5kg)",
      "seances": []
    },
    {
      "semaine": 3,
      "phase": "Progression",
      "objectif": "Charges +5-10%, focus sur la contraction musculaire",
      "seances": []
    },
    {
      "semaine": 4,
      "phase": "Progression",
      "objectif": "Volume augmenté, +1 série par exercice",
      "seances": []
    },
    {
      "semaine": 5,
      "phase": "Intensification",
      "objectif": "Surcharge progressive, techniques avancées",
      "seances": []
    },
    {
      "semaine": 6,
      "phase": "Peak",
      "objectif": "Test de force maximale et bilan final",
      "seances": []
    }
  ],
  "reglesSecurite": [
    "Toujours s'échauffer 10 minutes avant chaque séance",
    "Ne jamais sauter les jours de repos",
    "Arrêter immédiatement si douleur articulaire aiguë",
    "Progresser les charges de maximum 5-10% par semaine",
    "Boire 500ml d'eau avant et pendant l'entraînement"
  ],
  "conseils": ["conseil 1", "conseil 2", "conseil 3", "conseil 4", "conseil 5"]
}

IMPORTANT: 
- Génère des séances COMPLÈTES pour les semaines 1, 3 et 5 (les autres peuvent être vides)
- Chaque exercice doit avoir: nom, series, repetitions, repos, muscle, conseil technique, securite (avec ⚠️), echauffement
- Adapte les charges/reps selon la phase (semaines 1-2: reps hautes/charges légères, semaines 5-6: reps basses/charges lourdes)
- Calcule les vrais macros précisément
- Génère exactement ${nbSeances} séances pour la semaine 1
- Adapte selon le morphotype ${morphotype || 'standard'}: ectomorphe=+calories, endomorphe=-calories, mésomorphe=équilibré`;

  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullText = '';
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 6000,
      messages: [{ role: 'user', content: prompt }]
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        fullText += chunk.delta.text;
        res.write(`data: ${JSON.stringify({ chunk: chunk.delta.text })}\n\n`);
      }
    }

    // Parse and save
    try {
      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);

        // Add YouTube IDs to all weeks
        if (data.programme6semaines) {
          data.programme6semaines.forEach(sem => {
            if (sem.seances) {
              sem.seances.forEach(s => {
                if (s.exercices) {
                  s.exercices.forEach(e => {
                    e.youtubeId = getYoutubeId(e.nom, sexe);
                  });
                }
              });
            }
          });
        }

        // Also keep backward compat with entrainement field
        if (!data.entrainement && data.programme6semaines && data.programme6semaines[0]) {
          data.entrainement = { seances: data.programme6semaines[0].seances || [] };
        }

        const countRow = await db.get2('SELECT COUNT(*) as count FROM programmes WHERE user_id=?', [req.user.id]);
        const semaine = countRow.count + 1;
        await db.run2('INSERT INTO programmes (user_id, semaine, data) VALUES (?,?,?)',
          [req.user.id, semaine, JSON.stringify(data)]);

        await db.run2('UPDATE users SET age=?,poids=?,taille=?,sexe=?,objectif=?,niveau=?,jours=?,restrictions=? WHERE id=?',
          [age, poids, taille, sexe, objectif, niveau, jours, restrictions, req.user.id]);

        const existingSuivi = await db.get2('SELECT id FROM suivi WHERE user_id=? AND semaine=?', [req.user.id, semaine]);
        if (!existingSuivi) {
          const nbSeancesTotal = data.entrainement?.seances?.length || nbSeances;
          await db.run2('INSERT INTO suivi (user_id, semaine, poids, seances_total) VALUES (?,?,?,?)',
            [req.user.id, semaine, poids, nbSeancesTotal]);
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

// GET LATEST PROGRAMME — doit être AVANT /:id
router.get('/latest/current', auth, async (req, res) => {
  try {
    const prog = await db.get2('SELECT * FROM programmes WHERE user_id=? ORDER BY created_at DESC LIMIT 1', [req.user.id]);
    if (!prog) return res.status(404).json({ error: 'Aucun programme' });
    prog.data = JSON.parse(prog.data);
    res.json(prog);
  } catch(e) {
    console.error('latest/current error:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET SUIVI HISTORY — doit être AVANT /:id
router.get('/suivi/history', auth, async (req, res) => {
  try {
    const suivi = await db.all2('SELECT * FROM suivi WHERE user_id=? ORDER BY semaine ASC', [req.user.id]);
    const seances = await db.all2('SELECT * FROM seances_log WHERE user_id=? ORDER BY semaine ASC', [req.user.id]);
    res.json({ suivi, seances });
  } catch(e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET ALL PROGRAMMES
router.get('/', auth, async (req, res) => {
  const programmes = await db.all2('SELECT id, semaine, created_at FROM programmes WHERE user_id=? ORDER BY semaine DESC', [req.user.id]);
  res.json(programmes);
});

// GET SPECIFIC PROGRAMME — après les routes fixes
router.get('/:id', auth, async (req, res) => {
  try {
    const prog = await db.get2('SELECT * FROM programmes WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    if (!prog) return res.status(404).json({ error: 'Programme non trouvé' });
    prog.data = JSON.parse(prog.data);
    res.json(prog);
  } catch(e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
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

module.exports = router;
