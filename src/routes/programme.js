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

  const prompt = `Tu es un coach sportif et nutritionniste expert. Génère un programme en JSON UNIQUEMENT (pas de markdown, pas de texte avant ou après).

Profil: ${nom}, ${age} ans, ${poids}kg, ${taille}cm, ${sexe}, IMC:${imc}
Objectif: ${objectif} | Niveau: ${niveau} | ${nbSeances} séances/semaine
${morphText}
Restrictions: ${restrictions || 'aucune'}
${suppText}
Calories objectif: ${calObj} kcal | TDEE: ${tdee} kcal

JSON STRICT à retourner:
{
  "resume": {
    "calories": ${calObj},
    "proteines": 0,
    "glucides": 0,
    "lipides": 0,
    "imc": "${imc}",
    "imcStatut": "Normal",
    "message": "2 phrases motivantes personnalisées",
    "supplements": [{"nom": "Whey", "dose": "30g", "timing": "Post-entraînement", "conseil": "conseil court"}]
  },
  "nutrition": {
    "repas": [
      {"nom": "Petit-déjeuner", "heure": "07h00", "aliments": ["aliment 1", "aliment 2"], "calories": 0, "proteines": 0, "glucides": 0, "lipides": 0}
    ],
    "alimentsAutorise": ["aliment 1", "aliment 2", "aliment 3", "aliment 4"],
    "alimentsInterdits": ["aliment 1", "aliment 2", "aliment 3"]
  },
  "entrainement": {
    "seances": [
      {
        "jour": "Lundi",
        "type": "Push",
        "exercices": [
          {"nom": "Développé couché", "series": 4, "repetitions": "10-12", "repos": "90 sec", "muscle": "Pectoraux", "conseil": "Coudes à 45°", "securite": "⚠️ Ne pas verrouiller les coudes", "echauffement": "10 pompes légères"}
        ]
      }
    ]
  },
  "programme6semaines": [
    {"semaine": 1, "phase": "Adaptation", "objectif": "Maîtriser les mouvements", "charges": "60-65% max"},
    {"semaine": 2, "phase": "Adaptation", "objectif": "+2.5kg sur les charges", "charges": "65-70% max"},
    {"semaine": 3, "phase": "Progression", "objectif": "Augmenter les charges", "charges": "70-75% max"},
    {"semaine": 4, "phase": "Progression", "objectif": "+1 série par exercice", "charges": "75% max"},
    {"semaine": 5, "phase": "Intensification", "objectif": "Surcharge progressive", "charges": "80-85% max"},
    {"semaine": 6, "phase": "Peak", "objectif": "Test de force maximale", "charges": "85-90% max"}
  ],
  "reglesSecurite": [
    "S'échauffer 10 min avant chaque séance",
    "Progresser les charges de max 5-10% par semaine",
    "Arrêter si douleur articulaire aiguë",
    "Respecter les jours de repos",
    "Boire 2-3L d'eau par jour"
  ],
  "conseils": ["conseil 1", "conseil 2", "conseil 3", "conseil 4", "conseil 5"]
}

RÈGLES STRICTES:
- Génère exactement ${nbSeances} séances dans entrainement.seances
- Chaque exercice: nom, series (nombre), repetitions (string), repos, muscle, conseil, securite (avec ⚠️), echauffement
- Calcule les vrais macros (protéines: ${Math.round(poids * 2)}g, glucides et lipides selon objectif)
- Inclus 5-6 repas dans nutrition
- supplements: seulement si suppléments mentionnés: ${suppText}
- JSON valide et complet OBLIGATOIRE`;

  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullText = '';
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
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
      // Try to extract and repair JSON
      let jsonStr = null;
      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
        // Try to repair truncated JSON by closing open brackets
        let data = null;
        try {
          data = JSON.parse(jsonStr);
        } catch(e) {
          // Try to repair by finding last valid position
          console.log('JSON truncated, attempting repair...');
          // Count open/close braces and brackets
          let openBraces = 0, openBrackets = 0;
          let lastValidPos = 0;
          for (let i = 0; i < jsonStr.length; i++) {
            const c = jsonStr[i];
            if (c === '{') openBraces++;
            else if (c === '}') { openBraces--; if (openBraces === 0) lastValidPos = i; }
            else if (c === '[') openBrackets++;
            else if (c === ']') openBrackets--;
          }
          // Close all open structures
          let repaired = jsonStr;
          // Remove trailing comma if any
          repaired = repaired.replace(/,\s*$/, '');
          // Close open arrays and objects
          for (let i = 0; i < openBrackets; i++) repaired += ']';
          for (let i = 0; i < openBraces; i++) repaired += '}';
          try {
            data = JSON.parse(repaired);
            console.log('JSON repaired successfully');
          } catch(e2) {
            // Last resort: use only up to last complete object
            const truncated = jsonStr.substring(0, lastValidPos + 1);
            try { data = JSON.parse(truncated); } catch(e3) {
              throw new Error('JSON unrecoverable: ' + e2.message);
            }
          }
        }

        if (!data) throw new Error('No data parsed');

        // Add YouTube IDs
        if (data.entrainement?.seances) {
          data.entrainement.seances.forEach(s => {
            if (s.exercices) s.exercices.forEach(e => { e.youtubeId = getYoutubeId(e.nom, sexe); });
          });
        }

        // Keep backward compat
        if (!data.entrainement && data.programme6semaines?.[0]?.seances) {
          data.entrainement = { seances: data.programme6semaines[0].seances };
        }

        const countRow = await db.get2('SELECT COUNT(*) as count FROM programmes WHERE user_id=?', [req.user.id]);
        const semaine = countRow.count + 1;
        await db.run2('INSERT INTO programmes (user_id, semaine, data) VALUES (?,?,?)',
          [req.user.id, semaine, JSON.stringify(data)]);

        await db.run2('UPDATE users SET age=?,poids=?,taille=?,sexe=?,objectif=?,niveau=?,jours=?,restrictions=? WHERE id=?',
          [age, poids, taille, sexe, objectif, niveau, jours, restrictions, req.user.id]);

        const existingSuivi = await db.get2('SELECT id FROM suivi WHERE user_id=? AND semaine=?', [req.user.id, semaine]);
        if (!existingSuivi) {
          const nbS = data.entrainement?.seances?.length || nbSeances;
          await db.run2('INSERT INTO suivi (user_id, semaine, poids, seances_total) VALUES (?,?,?,?)',
            [req.user.id, semaine, poids, nbS]);
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
