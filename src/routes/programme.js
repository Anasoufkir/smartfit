const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const db = require('../db/database');
const auth = require('../middleware/auth');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// YouTube video IDs for exercises
const YOUTUBE_VIDEOS_HOMME = [
  // POITRINE — Jeff Nippard confirmés
  { keys: ['développé couché', 'bench press', 'développé plat', 'chest press'], id: 'vcBig73ojpE' },
  { keys: ['développé incliné', 'incline press', 'incliné haltères', 'incline dumbbell'], id: '8iPEnn-ltC8' },
  { keys: ['écarté', 'fly', 'pec deck', 'butterfly', 'câble croisé', 'chest fly'], id: 'fGm-ef-4PVk' },
  { keys: ['pompe', 'push up', 'push-up', 'flexion bras'], id: 'IODxDxX7oi4' },
  { keys: ['dips', 'barre parallèle', 'parallèles', 'triceps dips'], id: 'yTMGMmVkLMo' },
  // ÉPAULES — Jeff Nippard confirmés
  { keys: ['développé militaire', 'overhead press', 'military press', 'shoulder press', 'développé épaules'], id: 'qEwKCR5JCog' },
  { keys: ['élévation latérale', 'élévations latérales', 'lateral raise', 'oiseau latéral'], id: 'SgyUoY0IZ7A' },
  { keys: ['face pull', 'arrière épaule', 'rear delt', 'oiseau', 'poulie visage'], id: 'rep-qVOkqgk' },
  { keys: ['élévation frontale', 'front raise', 'oiseau avant'], id: 'sOkWMWhMkCY' },
  // TRICEPS — Jeff Nippard confirmés
  { keys: ['extension triceps', 'triceps poulie', 'pushdown', 'push down', 'corde triceps', 'triceps cable'], id: 'OpRMRhr0Ycc' },
  { keys: ['skull crusher', 'barre front', 'extension nuque', 'french press', 'barre crâne'], id: 'NIH2y0OmCvY' },
  { keys: ['kickback triceps', 'kick back', 'triceps kickback'], id: 'ZOJXcYHMKAg' },
  // DOS — Jeff Nippard confirmés
  { keys: ['tirage vertical', 'lat pulldown', 'tirage nuque', 'tirage poitrine', 'pulldown'], id: 'CAwf7n6Luuc' },
  { keys: ['traction', 'pull up', 'pull-up', 'chin up', 'tractions'], id: 'eGo4IYlbE5g' },
  { keys: ['rowing assis', 'rowing câble', 'tirage horizontal', 'seated row', 'tirage basse poulie', 'câble rowing'], id: 'GZbfZ033f74' },
  { keys: ['rowing barre', 'bent over row', 'rowing penché', 'barbell row'], id: 'T3N-TO4reLQ' },
  { keys: ['rowing haltère', 'rowing unilatéral', 'rowing un bras', 'one arm row', 'haltère un bras'], id: 'pYcpY20QaE8' },
  { keys: ['meilleur exercice dos', 'back exercises ranked'], id: 'jLvqKgW-_G8' },
  { keys: ['pull over', 'pullover', 'tirage buste'], id: 'FK4rHfGAFlk' },
  { keys: ['soulevé de terre', 'deadlift', 'soulever de terre'], id: 'op9kVnSso6Q' },
  { keys: ['soulevé roumain', 'romanian deadlift', 'rdl', 'deadlift roumain'], id: 'JCXUYuzwNrM' },
  { keys: ['hyperextension', 'extension lombaire', 'good morning', 'back extension'], id: '4e5DXBJ4p40' },
  // BICEPS — Jeff Nippard confirmés
  { keys: ['curl barre', 'curl biceps barre', 'barbell curl', 'barre ez', 'ez bar curl'], id: 'GNO4OtYoCYk' },
  { keys: ['curl haltères', 'curl alternés', 'dumbbell curl', 'curl biceps haltères'], id: 'sAq_ocpRh_I' },
  { keys: ['curl marteau', 'hammer curl', 'prise neutre', 'marteau'], id: 'zC3nLlEvin4' },
  { keys: ['curl concentré', 'concentration curl', 'curl prédicateur'], id: '0AUGkch3tzc' },
  { keys: ['curl câble', 'curl poulie', 'bayesian curl', 'câble curl'], id: 'NFzTWp2qpiE' },
  // JAMBES — Jeff Nippard confirmés
  { keys: ['squat', 'squat barre', 'back squat', 'squat guidé', 'smith squat', 'squat bulgare'], id: 'bEv6CCg2BC8' },
  { keys: ['quad', 'quadriceps', 'meilleur exercice jambes'], id: 'kIXcoivzGf8' },
  { keys: ['presse à cuisses', 'leg press', 'presse jambes', 'machine jambes'], id: 'IZxyjW7MPJQ' },
  { keys: ['leg extension', 'extension quadriceps', 'extension jambe', 'machine quadriceps'], id: 'YyvSfVjQeL0' },
  { keys: ['leg curl', 'curl ischio', 'flexion jambe', 'hamstring curl', 'ischio jambiers'], id: '1Tq3QdYUuHs' },
  { keys: ['fente', 'lunge', 'fentes marchées', 'fentes avant', 'split squat'], id: 'QOVaHwm-Q6U' },
  { keys: ['mollet', 'calf raise', 'élévation mollets', 'standing calf', 'gastrocnémien'], id: 'gwLzBJYoWlI' },
  { keys: ['hip thrust', 'fessiers pont', 'glute bridge', 'pont fessier', 'fessiers machine'], id: 'SEdqd1n0cvg' },
  { keys: ['goblet squat'], id: 'MeIiIdhvXT4' },
  { keys: ['sumo squat', 'sumo deadlift', 'squat sumo'], id: 'jaEGjaxku04' },
  // ABDOS / CORE
  { keys: ['planche', 'plank', 'gainage', 'core stability'], id: 'pSHjTRCQxIw' },
  { keys: ['crunch', 'abdominaux', 'sit up', 'crunch câble'], id: 'Xyd_fa5zoEU' },
  { keys: ['russian twist', 'rotation tronc'], id: 'wkD8rjkodUI' },
  { keys: ['relevé jambes', 'leg raise', 'relevé de jambes', 'hanging leg raise'], id: 'l4kQd9eWclE' },
  { keys: ['mountain climber', 'grimpeur'], id: 'nmwgirgXLYM' },
];

const YOUTUBE_VIDEOS_FEMME = [
  // FESSIERS / JAMBES (priorité pour les femmes)
  { keys: ['hip thrust', 'fessiers pont', 'glute bridge', 'pont fessier'], id: 'jGNzDNmPuQY' },
  { keys: ['squat', 'squat barre', 'back squat', 'squat guidé', 'smith squat'], id: 'aclHkVaku9U' },
  { keys: ['sumo squat', 'sumo deadlift'], id: 'BE1EKz9OxCc' },
  { keys: ['fente', 'lunge', 'fentes marchées', 'fentes avant'], id: 'wrwwXE_x-pQ' },
  { keys: ['leg press', 'presse à cuisses', 'presse jambes'], id: 'yZmx_Ac3880' },
  { keys: ['leg curl', 'curl ischio', 'flexion jambe', 'hamstring curl'], id: 'ELOCsoDSmrg' },
  { keys: ['leg extension', 'extension quadriceps', 'extension jambe'], id: 'wJEN0ASZF4E' },
  { keys: ['mollet', 'calf raise', 'élévation mollets', 'standing calf'], id: 'gwLzBJYoWlI' },
  { keys: ['step up', 'montée genoux'], id: 'dQqApCGd5Ss' },
  { keys: ['goblet squat'], id: 'o2KMqFGaVA0' },
  { keys: ['donkey kick', 'coup de pied', 'abduction'], id: ''+'SdJNACSJBRc' },
  { keys: ['fire hydrant', 'abduction hanche'], id: 'iy3fDnKFqw0' },
  { keys: ['kickback fessier', 'extension hanche'], id: 'ELOCsoDSmrg' },
  // DOS
  { keys: ['tirage vertical', 'lat pulldown', 'tirage nuque', 'tirage poitrine'], id: 'JwxCMEqcuWQ' },
  { keys: ['traction', 'pull up', 'pull-up', 'chin up'], id: 'p2_Fvzgs7Fc' },
  { keys: ['rowing assis', 'rowing câble', 'tirage horizontal', 'seated row', 'tirage basse poulie'], id: 'UCXxvVItLoM' },
  { keys: ['rowing haltère', 'rowing unilatéral', 'rowing un bras', 'one arm row'], id: 'lB2BytVOCsU' },
  { keys: ['rowing barre', 'bent over row', 'rowing penché'], id: 'CZuBs5eFd_A' },
  { keys: ['soulevé de terre', 'deadlift', 'soulever de terre'], id: '_YgkZFMSI4s' },
  { keys: ['pull over', 'pullover'], id: 'FK4rHfGAFlk' },
  { keys: ['hyperextension', 'extension lombaire', 'good morning'], id: '4e5DXBJ4p40' },
  // ÉPAULES
  { keys: ['développé militaire', 'overhead press', 'shoulder press', 'military press'], id: 'qEwKCR5JCog' },
  { keys: ['élévation latérale', 'élévations latérales', 'lateral raise'], id: 'kDqklk1ZESo' },
  { keys: ['élévation frontale', 'front raise'], id: 'sOkWMWhMkCY' },
  { keys: ['face pull', 'oiseau', 'rear delt', 'arrière épaule'], id: 'rep-qVOkqgk' },
  // POITRINE
  { keys: ['développé couché', 'bench press', 'développé plat'], id: 'leEcDcP5a8c' },
  { keys: ['développé incliné', 'incline press', 'incliné haltères'], id: 'L_BFLF_KFRI' },
  { keys: ['écarté', 'fly', 'pec deck', 'butterfly'], id: 'eozdVDA78K0' },
  { keys: ['pompe', 'push up', 'push-up'], id: 'IODxDxX7oi4' },
  // BRAS
  { keys: ['curl haltères', 'curl alternés', 'dumbbell curl', 'curl biceps'], id: 'sAq_ocpRh_I' },
  { keys: ['curl marteau', 'hammer curl', 'prise neutre'], id: 'zC3nLlEvin4' },
  { keys: ['curl barre', 'barbell curl', 'barre ez', 'ez bar'], id: 'kwG2ipFRgfo' },
  { keys: ['extension triceps', 'triceps poulie', 'pushdown', 'push down'], id: '2-LAMcpzODU' },
  { keys: ['dips', 'barre parallèle'], id: 'yTMGMmVkLMo' },
  { keys: ['kickback triceps', 'kick back'], id: 'ZOJXcYHMKAg' },
  // ABDOS / CORE
  { keys: ['planche', 'plank', 'gainage'], id: 'dD_3GEpFUOA' },
  { keys: ['crunch', 'abdominaux', 'sit up'], id: 'MKmrqcoCZ-M' },
  { keys: ['russian twist', 'rotation tronc'], id: 'wkD8rjkodUI' },
  { keys: ['relevé jambes', 'leg raise', 'relevé de jambes'], id: 'l4kQd9eWclE' },
  { keys: ['mountain climber', 'grimpeur'], id: 'nmwgirgXLYM' },
  // CARDIO / FULL BODY
  { keys: ['burpee'], id: 'TU8QYVW0gDU' },
  { keys: ['jumping jack', 'écart saut'], id: 'iSSAk4XCsRA' },
  { keys: ['corde à sauter', 'jump rope', 'sauter corde'], id: 'u3zgHI8QnqE' },
  { keys: ['box jump', 'saut boîte'], id: 'NBY9-kTuHEk' },
  { keys: ['mountain climber', 'grimpeur'], id: 'nmwgirgXLYM' },
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
