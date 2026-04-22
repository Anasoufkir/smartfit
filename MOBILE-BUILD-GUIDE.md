# 📱 SmartFit Mobile — Guide de Build iOS + Android

Transforme SmartFit en vraie application mobile installable sur iOS et Android avec Capacitor.

## 🎯 Prérequis

### Pour iOS (obligatoire)
- 💻 **Mac** (Xcode ne fonctionne que sur macOS)
- 🛠 **Xcode 15+** (gratuit sur Mac App Store)
- 👤 **Compte Apple Developer** — 99$/an pour App Store, GRATUIT pour installer sur ton iPhone
- 📱 **CocoaPods** : `sudo gem install cocoapods`

### Pour Android
- 💻 Windows, Mac ou Linux
- 🛠 **Android Studio** (gratuit) → https://developer.android.com/studio
- 👤 **Compte Google Play Console** — 25$ une fois pour le Play Store
- 📱 **Java JDK 17+**

---

## 🚀 Setup initial (une seule fois)

Sur ta machine locale, clone le projet :

```bash
git clone https://github.com/Anasoufkir/smartfit.git
cd smartfit
npm install
```

---

## 🍎 BUILD iOS

### 1. Ajouter la plateforme iOS

```bash
npx cap add ios
npx cap sync ios
```

### 2. Ouvrir dans Xcode

```bash
npx cap open ios
```

### 3. Configurer dans Xcode

1. Sélectionne le projet **App** dans le sidebar
2. Onglet **Signing & Capabilities**
3. Team : sélectionne ton compte Apple
4. Bundle Identifier : `com.anasoufkir.smartfit` (déjà configuré)
5. Coche **Automatically manage signing**

### 4. Tester sur simulateur iOS

Dans Xcode : clique sur ▶️ en haut — sélectionne un iPhone simulator

### 5. Tester sur ton iPhone physique

1. Branche ton iPhone au Mac
2. Dans Xcode, sélectionne ton iPhone en haut
3. Clique ▶️
4. Sur ton iPhone : Réglages → Général → VPN → Profils → **Faire confiance** à ton certificat

### 6. Publier sur l'App Store

1. Xcode → **Product** → **Archive**
2. Organizer → **Distribute App** → App Store Connect
3. Aller sur [App Store Connect](https://appstoreconnect.apple.com)
4. Créer une nouvelle app → remplir les infos → soumettre à review

⏱ **Validation App Store : 1-7 jours**

---

## 🤖 BUILD Android

### 1. Ajouter la plateforme Android

```bash
npx cap add android
npx cap sync android
```

### 2. Ouvrir dans Android Studio

```bash
npx cap open android
```

### 3. Tester sur émulateur Android

Dans Android Studio : clique sur ▶️ — choisis un émulateur ou crée-en un

### 4. Tester sur ton téléphone Android

1. Active **Options développeur** sur ton Android (tape 7 fois sur "Numéro de build" dans les paramètres)
2. Active **Débogage USB**
3. Branche ton téléphone, Android Studio le détectera
4. Clique ▶️

### 5. Générer un APK pour partage direct (hors Play Store)

```bash
cd android
./gradlew assembleRelease
```

APK généré dans : `android/app/build/outputs/apk/release/app-release.apk`

Tu peux l'envoyer directement à tes amis pour qu'ils l'installent !

### 6. Publier sur le Play Store

1. Android Studio → **Build** → **Generate Signed Bundle / APK**
2. Choisis **Android App Bundle (AAB)**
3. Crée une nouvelle keystore (garde-la précieusement !)
4. Aller sur [Google Play Console](https://play.google.com/console)
5. Créer une nouvelle app → upload le AAB → soumettre

⏱ **Validation Play Store : quelques heures à 2 jours**

---

## 🔄 Mise à jour du code

Comme on utilise `server.url` dans la config Capacitor, **l'app charge toujours la dernière version du site web**. Donc :

- ✅ Mettre à jour le site = l'app est automatiquement à jour
- ❌ Seulement si tu changes les plugins natifs, il faut rebuild

Pour synchroniser après des changements côté web :
```bash
npx cap sync
```

---

## 🔑 Icônes et Splash Screen

Les icônes iOS sont dans : `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
Les icônes Android dans : `android/app/src/main/res/mipmap-*/`

Tu peux utiliser **https://www.appicon.co** pour générer toutes les tailles automatiquement depuis une seule image 1024x1024.

---

## 📞 Permissions natives

Pour utiliser la géolocalisation dans l'app native (déjà fait dans SmartFit) :

**iOS** — Ajouter dans `ios/App/App/Info.plist` :
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>SmartFit utilise ta position pour trouver les salles de sport proches</string>
```

**Android** — Déjà auto-configuré par Capacitor.

---

## 💡 Conseils pros

1. **Teste d'abord en PWA** — https://fit.anasoufkir.com installe sur l'écran d'accueil pour tester
2. **Commence par Android** — plus rapide et moins cher (25$ vs 99$)
3. **Utilise TestFlight pour iOS** — test bêta gratuit avant App Store
4. **Garde tes keystores** — si tu perds la keystore Android, tu ne peux plus mettre à jour ton app

---

## 🆘 Dépannage

**Erreur "CocoaPods not found" (iOS)**
```bash
sudo gem install cocoapods
```

**Erreur "SDK not found" (Android)**
Installer Android SDK via Android Studio → Tools → SDK Manager

**L'app affiche une page blanche**
Vérifie que `server.url` dans `capacitor.config.ts` pointe vers un site HTTPS valide.

---

Made with ❤️ by Anas Oufkir
