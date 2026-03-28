# Lakou Manman — Kominote Manman Ayisyèn

Yon platfòm entèraktif pou manman ayisyèn jwenn konsèy, sipò, epi pataje eksperyans yo.

## Stack Technique

- **Frontend**: Next.js 14 (App Router) + React 18
- **UI**: Tailwind CSS + shadcn/ui + Framer Motion
- **Auth**: Firebase Authentication
- **Base de données**: Cloud Firestore
- **Storage**: Firebase Storage
- **Hébergement**: Vercel (frontend) + Firebase (backend)

## Fonctionnalités

- **Auth** : inscription, connexion, mot de passe oublié
- **Profils mamans** : avatar, ville, pays, âge enfants, bio, badges
- **Feed communautaire** : posts, commentaires, likes, sauvegarde, filtres
- **Groupes** : nouveau-né, post-partum, diaspora, alimentation, travail & famille
- **Espace pédiatre** : articles validés, questions générales
- **Quiz interactifs** : quiz sommeil bébé avec résultats personnalisés
- **Guides & ressources** : PDF, checklists, articles
- **Admin** : modération posts, gestion rapports, vue utilisatrices

## Installation

### 1. Cloner le projet

```bash
cd lakou-manman
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer Firebase

1. Créer un projet sur [Firebase Console](https://console.firebase.google.com)
2. Activer **Authentication** (Email/Password)
3. Créer une base **Cloud Firestore**
4. Activer **Firebase Storage**
5. Copier les clés de config

```bash
cp .env.local.example .env.local
```

Remplir `.env.local` avec vos clés Firebase :

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### 4. Configurer Firestore (règles de sécurité de base)

Dans la console Firebase > Firestore > Rules :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /posts/{postId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null;
    }
    match /posts/{postId}/comments/{commentId} {
      allow read: if true;
      allow create: if request.auth != null;
    }
    match /posts/{postId}/likes/{likeId} {
      allow read, write: if request.auth != null;
    }
    match /groups/{groupId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /guides/{guideId} {
      allow read: if true;
    }
    match /doctor_articles/{articleId} {
      allow read: if true;
    }
    match /doctor_questions/{questionId} {
      allow read: if true;
      allow create: if request.auth != null;
    }
    match /reports/{reportId} {
      allow create: if request.auth != null;
      allow read, update: if request.auth != null;
    }
    match /quiz_results/{resultId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null;
    }
  }
}
```

### 5. Créer un admin

Après inscription d'un utilisateur, dans Firestore > `users` > {uid}, ajouter le champ :
```
role: "admin"
```

### 6. Lancer le serveur de développement

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## Structure du projet

```
src/
├── app/                    # Pages (Next.js App Router)
│   ├── page.jsx            # Landing page
│   ├── layout.jsx          # Layout principal
│   ├── login/              # Connexion
│   ├── register/           # Inscription
│   ├── forgot-password/    # Mot de passe oublié
│   ├── feed/               # Feed communautaire
│   ├── groups/             # Groupes (liste + détail)
│   ├── profile/            # Profil utilisatrice
│   ├── doctor/             # Espace pédiatre
│   ├── tools/              # Quiz & outils
│   ├── guides/             # Guides & ressources
│   └── admin/              # Panel admin / modération
├── components/
│   ├── ui/                 # Composants shadcn/ui
│   ├── layout/             # Navbar, Footer
│   └── posts/              # PostCard, PostForm
├── contexts/
│   └── AuthContext.jsx     # Contexte auth Firebase
└── lib/
    ├── firebase.js         # Config Firebase
    ├── firestore.js        # Service CRUD Firestore
    └── utils.js            # Utilitaires
```

## Collections Firestore

| Collection         | Description                      |
|---------------------|----------------------------------|
| `users`             | Profils utilisatrices            |
| `posts`             | Posts communautaires             |
| `posts/*/comments`  | Commentaires par post            |
| `posts/*/likes`     | Likes par post                   |
| `groups`            | Groupes communautaires           |
| `guides`            | Guides et ressources             |
| `doctor_articles`   | Articles pédiatre validés        |
| `doctor_questions`  | Questions pour le pédiatre       |
| `reports`           | Signalements de contenu          |
| `quiz_results`      | Résultats quiz                   |

## Déploiement sur Vercel

1. Push le code sur GitHub
2. Connecter le repo sur [vercel.com](https://vercel.com)
3. Ajouter les variables d'environnement Firebase
4. Déployer

## Phases futures

- **Phase 2** : notifications, posts sauvegardés, badges, recherche, modération avancée
- **Phase 3** : messagerie, carte mondiale, système mentor, suivi bébé
- **Phase 4** : contenus premium, marketplace, app mobile (React Native)
