# SmartFit V2 🏋️

Plateforme fitness complète avec authentification, suivi hebdomadaire et vidéos YouTube.

## Stack
- Node.js + Express + SQLite + JWT + Anthropic API

## Déploiement VPS

```bash
# 1. Cloner
cd /var/www && git clone https://github.com/Anasoufkir/smartfit.git smartfit && cd smartfit

# 2. Installer
npm install

# 3. .env
cp .env.example .env && nano .env

# 4. Lancer
pm2 start server.js --name smartfit && pm2 save

# 5. Nginx proxy_pass http://localhost:3002
```
