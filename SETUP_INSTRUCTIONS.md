# Instructions de Configuration du Projet ANESP

## ✅ Dépendances installées
Les dépendances du backend et du frontend ont été installées avec succès.

## ⚠️ Configuration requise

### 1. Configuration de PostgreSQL

Le projet nécessite une base de données PostgreSQL. Vous devez :

1. **Installer PostgreSQL** (si ce n'est pas déjà fait)
   - Téléchargez depuis https://www.postgresql.org/download/

2. **Créer la base de données**
   ```sql
   CREATE DATABASE anesp;
   ```

3. **Configurer le fichier `.env` dans `backend/`**
   
   Créez un fichier `backend/.env` avec le contenu suivant (ajustez selon votre configuration PostgreSQL) :
   
   ```env
   # Database Configuration
   DATABASE_URL=postgresql://votre_user:votre_mot_de_passe@localhost:5432/anesp
   # OU utilisez les paramètres individuels :
   # DB_HOST=localhost
   # DB_PORT=5432
   # DB_USER=votre_user
   # DB_PASSWORD=votre_mot_de_passe
   # DB_NAME=anesp
   
   # Server Configuration
   PORT=4000
   NODE_ENV=development
   JWT_SECRET=dev-secret-change-in-production
   
   # Email Configuration (optionnel pour le développement)
   EMAIL_FROM=workflow@anesp.gov
   SMTP_SERVICE=gmail
   SMTP_USER=votre_email@gmail.com
   SMTP_PASS=votre_mot_de_passe_app
   SMTP_SECURE=true
   
   # Frontend URL
   FRONTEND_URL=http://localhost:3000
   ```

4. **Lancer le seed de la base de données**
   ```bash
   npm run seed --prefix backend
   ```
   
   Cela créera les tables et les comptes utilisateurs par défaut :
   - `engineer@anesp.gov` / `Password123!`
   - `tech@anesp.gov` / `Password123!`
   - `mg@anesp.gov` / `Password123!`
   - `daf@anesp.gov` / `Password123!`
   - `dg@anesp.gov` / `Password123!`
   - `rh@anesp.gov` / `Password123!`

## 🚀 Serveurs démarrés

Les serveurs ont été lancés en mode développement :

- **Backend** : http://localhost:4000
- **Frontend** : http://localhost:3000

### Commandes pour redémarrer

Si vous devez redémarrer les serveurs :

**Backend** :
```bash
npm run dev --prefix backend
```

**Frontend** :
```bash
npm run dev --prefix frontend
```

## 📝 Notes importantes

1. **Base de données** : Le backend nécessite PostgreSQL. Assurez-vous que PostgreSQL est en cours d'exécution avant de lancer le backend.

2. **Email** : La configuration email est optionnelle pour le développement. Les notifications par email ne fonctionneront pas sans configuration SMTP valide.

3. **Polices PDF** : Pour la génération de PDFs avec les polices officielles, placez les fichiers `.ttf` suivants dans `backend/src/assets/fonts/` :
   - `HeiseiKakuGo-W5.ttf`
   - `HYSMyeongJo-Medium.ttf`

4. **Première connexion** : Utilisez l'un des comptes créés par le seed pour vous connecter à l'interface.

## 🔍 Vérification

1. Ouvrez http://localhost:3000 dans votre navigateur
2. Connectez-vous avec `engineer@anesp.gov` / `Password123!`
3. Vous devriez voir le tableau de bord

Si vous rencontrez des erreurs, vérifiez :
- Que PostgreSQL est en cours d'exécution
- Que la base de données `anesp` existe
- Que les identifiants dans `.env` sont corrects
- Les logs du backend dans le terminal

