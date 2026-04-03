# Lakou Manman — Diagnostic technique

## Vue d'ensemble

**Lakou Manman** est une plateforme communautaire haïtienne à destination des familles. Elle couvre la messagerie, les groupes, la boutique, les jeux éducatifs, les consultations médicales et les guides parentaux. Elle est disponible en français (FR) et en créole haïtien (HT).

---

## Stack technique

### Frontend
| Technologie | Version | Rôle |
|---|---|---|
| **Next.js** | 14.2 | Framework React — App Router, SSR/SSG, API Routes |
| **React** | 18.3 | UI — composants, hooks, contextes |
| **TailwindCSS** | 3.4 | Styling utilitaire |
| **Radix UI** | 1.x / 2.x | Composants accessibles (Dialog, Toast, Tabs, Select…) |
| **Lucide React** | 0.400 | Icônes |
| **Framer Motion** | 11 | Animations |
| **date-fns** | 3.6 | Manipulation de dates |

### Backend & Services cloud
| Service | Rôle |
|---|---|
| **Firebase Auth** | Authentification — Google OAuth + email/mot de passe |
| **Firestore** | Base de données NoSQL temps réel (messages, profils, jeux, boutique, groupes…) |
| **Firebase Storage** | Stockage de médias (photos de profil, preuves de paiement…) |
| **Firebase Admin SDK** | Accès serveur sécurisé depuis les API Routes Next.js |
| **Agora RTC** | Appels vidéo et audio temps réel |
| **Stripe** | Paiements internationaux par carte |
| **MonCash** | Paiements mobiles haïtiens |
| **Resend** | Envoi d'emails transactionnels (invitations, notifications de groupe) |

### Internationalisation
- **i18next** + **react-i18next** + **next-i18next**
- Langues : **Français (FR)** et **Créole haïtien (HT)**
- Fichiers de traduction : `locales/fr/` et `locales/ht/`

### Sécurité & règles
- **Firestore Security Rules** (`firestore.rules`) — contrôle d'accès par participant, par rôle (admin, doctor_editor), par propriétaire
- **Firebase Storage Rules** (`storage.rules`) — accès restreint aux utilisateurs authentifiés

---

## Architecture de l'application

```
src/
├── app/                    Pages Next.js (App Router)
│   ├── api/                Routes API serveur
│   │   ├── agora/          Token Agora pour appels vidéo
│   │   ├── chess-invite-email/   Email d'invitation aux échecs
│   │   ├── contact/        Formulaire de contact
│   │   ├── create-payment-intent/  Stripe
│   │   ├── group-post-email/  Notifications email de posts
│   │   ├── moncash-payment/  Paiement MonCash
│   │   ├── moncash-webhook/  Webhook MonCash
│   │   └── telemetry/      Télémétrie interne
│   ├── messages/           Messagerie temps réel + appels vidéo
│   ├── games/              Jeux (Échecs, Mémoire, Montessori, Émotions, Quiz)
│   ├── boutique/           Marketplace avec paiements
│   ├── groups/             Groupes communautaires
│   ├── feed/               Fil d'actualité social
│   ├── notifications/      Centre de notifications
│   ├── profile/            Profil utilisateur
│   ├── doctor/             Pages médecins (pédiatre, gynéco, psycho)
│   ├── admin/              Panneau d'administration
│   └── onboarding/         Parcours d'inscription
├── components/             Composants réutilisables (UI + métier)
├── contexts/
│   ├── AuthContext.jsx     Auth + profil utilisateur
│   ├── LanguageContext.jsx Traductions FR/HT
│   ├── NotificationContext.jsx  Notifications temps réel
│   └── ThemeContext.jsx    Thème clair/sombre
└── lib/
    ├── firestore.js        Toutes les fonctions Firestore (~3900 lignes)
    ├── firebase.js         Initialisation Firebase
    ├── utils.js            Utilitaires communs
    ├── telemetry.js        Télémétrie interne
    ├── stripe.js           Config Stripe
    └── server/             Helpers Firebase Admin (serveur uniquement)
```

---

## Collections Firestore principales

| Collection | Contenu |
|---|---|
| `users` | Profils, rôles, tokens FCM |
| `conversations` | Conversations 1-à-1 |
| `conversations/{id}/messages` | Messages (limité aux 100 derniers) |
| `groups` | Groupes communautaires |
| `posts` | Posts du fil + groupes |
| `chessGames` | Sessions de jeu d'échecs en duel |
| `chessGames/{id}/messages` | Chat entre joueurs |
| `shopItems` | Articles de la boutique |
| `shopOrders` | Commandes |
| `notifications` | Notifications utilisateurs |
| `doctor_profiles` | Profils médecins |
| `doctor_articles` / `doctor_videos` | Contenus médicaux |

---

## Méthode de déploiement

### Frontend — Vercel
```bash
# Login (si token expiré)
npx vercel login

# Déploiement en production
npx vercel --prod
```
- Domaine de production : **https://www.lakoumanman.com**
- Les variables d'environnement (`NEXT_PUBLIC_FIREBASE_*`, `STRIPE_*`, `AGORA_*`, `RESEND_API_KEY`…) doivent être configurées dans **Vercel Dashboard → Settings → Environment Variables**

### Règles & Index Firestore — Firebase CLI
```bash
# Règles uniquement
firebase deploy --only firestore:rules

# Index uniquement
firebase deploy --only firestore:indexes

# Règles + Index
firebase deploy --only firestore
```

### Développement local
```bash
npm run dev       # Démarre sur http://localhost:3000
npm run build     # Build de production (vérification types + lint)
npm run start     # Démarre le build de production en local
```

---

## Domaines à autoriser dans Firebase

**Firebase Console → Authentication → Settings → Authorized domains :**
- `localhost` *(par défaut)*
- `lakou-manman.firebaseapp.com` *(par défaut)*
- `lakou-manman.web.app` *(par défaut)*
- `lakou-manman.vercel.app` *(custom)*
- `www.lakoumanman.com` *(custom — production)*
- `lakoumanman.com` *(custom — production)*

---

## Points d'attention

- **Firestore Security Rules** — vérifier à chaque ajout de collection que les règles couvrent les nouveaux accès
- **Variables d'environnement** — `.env.local` n'est jamais déployé automatiquement ; mettre à jour Vercel manuellement si une variable change
- **Composite indexes** — toute nouvelle query Firestore multi-champs nécessite un index dans `firestore.indexes.json` puis un `firebase deploy --only firestore:indexes`
- **Unused function `isOwner`** — avertissement présent dans `firestore.rules` (non bloquant)
