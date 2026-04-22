# 🚀 Déployer SmartFit sur iOS avec Codemagic (sans Mac)

Codemagic compile ton app iOS **dans le cloud** et te donne un fichier IPA installable sur iPhone.

## 📋 Étapes

### 1. Créer un compte Codemagic
👉 **https://codemagic.io/signup**

Connecte-toi avec ton compte **GitHub** (c'est le plus simple).

### 2. Importer le projet SmartFit

1. Clique **"Add application"**
2. Sélectionne ton repo : `Anasoufkir/smartfit`
3. Type : **Flutter / React Native / Ionic / Capacitor**
4. Clique **"Finish"**

### 3. Démarrer un build

Le fichier `codemagic.yaml` est déjà dans ton repo ✅

1. Dans Codemagic, clique sur **"Start new build"**
2. Sélectionne le workflow **"SmartFit iOS Build"**
3. Clique **"Start build"**

⏱ **Le build prend ~15-20 minutes**

### 4. Télécharger l'IPA

Quand le build est fini :
- Tu reçois un email avec le lien de téléchargement
- Ou dans Codemagic → Artifacts → `SmartFit.ipa`

---

## 📱 Installer l'IPA sur ton iPhone

⚠️ **IMPORTANT** : Sans compte Apple Developer (99$/an), l'IPA ne peut PAS être installée directement. Tu as 3 options :

### Option A — Compte Apple Developer (99$/an)
Avec un compte Apple Developer, l'IPA sera **signée automatiquement** et installable sur tous les iPhones via TestFlight.

Dans Codemagic, ajoute :
- **App Store Connect API Key** (Settings → Integrations)
- Activera la signature automatique

### Option B — **AltStore / Sideloadly** (gratuit, mais limité)
Outils pour installer des IPA non signés sur ton iPhone perso.

👉 **https://altstore.io** (gratuit)
👉 **https://sideloadly.io** (gratuit)

⚠️ L'app expire après 7 jours (limite Apple pour les certificats gratuits)

### Option C — **TestFlight** (recommandé pour tests)
Pour partager avec plusieurs testeurs (jusqu'à 10 000 personnes !)

Nécessite compte Apple Developer → les testeurs téléchargent TestFlight → reçoivent une invitation.

---

## 💰 Coûts

| Service | Prix | Notes |
|---------|------|-------|
| **Codemagic** | Gratuit | 500 min/mois — largement suffisant |
| **Apple Developer** | 99$/an | Pour publier sur App Store ou TestFlight |
| **AltStore** | Gratuit | Pour tests perso, expire après 7 jours |

---

## 🎯 Workflow recommandé pour débutants

1. **Commence par Android** — beaucoup moins de friction
2. **Teste iOS gratuitement** avec Codemagic + AltStore
3. **Si ça te plaît** → paye les 99$ Apple Developer pour l'App Store

---

## 🆘 Problèmes fréquents

**"CODE_SIGNING_REQUIRED is set to YES"**
→ L'IPA non signée ne peut pas être installée directement. Utilise AltStore ou ajoute un compte Apple Developer dans Codemagic.

**Le build échoue**
→ Regarde les logs dans Codemagic, partage-moi l'erreur et je corrige le YAML.

**Je n'ai pas d'iPhone pour tester**
→ Tu peux utiliser le simulateur dans Codemagic Artifacts (fichier `.app` au lieu d'`.ipa`).

---

Made with ❤️ by Anas Oufkir
