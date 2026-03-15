# 🎨 RAG Chatbot Frontend - v0.1

## 📋 Description

Interface utilisateur moderne pour le système RAG Chatbot permettant aux entreprises d'interroger leurs bases documentaires via une interface conversationnelle intuitive.

### Fonctionnalités Implémentées

- 🔐 **Authentification Sécurisée** : Login/Register avec JWT
- 📊 **Dashboard Dynamique** : Vue d'ensemble topics et statistiques  
- 📁 **Gestion Topics** : Interface CRUD complète avec permissions
- 📄 **Upload Documents** : Drag & drop multi-formats avec progress
- 💬 **Chat Intelligent** : Interface conversationnelle avec citations sources
- 📱 **Responsive Design** : Mobile-first, adaptatif toutes tailles écran
- 🔐 **Gestion Permissions Granulaires** : Attribution READ/WRITE/ADMIN par utilisateur et topic
- 👥 **Administration Utilisateurs** : CRUD complet (ADMIN uniquement)

## 🏗️ Architecture

### Stack Technique

- **Framework** : React 18.3.1 + TypeScript 5.8.3
- **Build Tool** : Vite 7.1.4 (HMR optimisé)
- **Styling** : Tailwind CSS 3.4.17 (utilitaires)
- **State Management** : Zustand 5.0.8 (simple, performant)
- **Routing** : React Router 6.30.1 (navigation SPA)
- **HTTP Client** : Axios avec intercepteurs JWT
- **Icons** : Lucide React (modernes, cohérents)

### Architecture des Stores

```
stores/
├── authStore.ts         # Authentification + session
├── topicsStore.ts       # Gestion topics + permissions
├── documentsStore.ts    # Upload + gestion documents
└── conversationsStore.ts # Chat + historique messages
├── permissionsStore.ts    #  Gestion permissions granulaires
└── usersStore.ts          #  Administration utilisateurs (ADMIN)
```

### Structure Composants

```
src/
├── components/
│   ├── auth/            # LoginForm, RegisterForm
│   ├── layout/          # ProtectedRoute, Header, Navigation
│   ├── topics/          # TopicCard, CreateTopicModal, TopicGrid
│   ├── documents/       # DocumentUpload, DocumentList, DocumentStats
│   ├── workspace/         #  TopicHeader, KnowledgeBase, IntegratedChat
│   ├── permissions/       #  PermissionsPanel, PermissionUserCard, Modals
│   └── chat/            # ChatInterface, MessageBubble, MessageInput



├── pages/
│   ├── AuthPage.tsx     # Authentification
│   ├── DashboardPage.tsx # Dashboard principal
│   └── TopicDetailPage.tsx # Gestion documents + chat
├── services/
│   └── api.ts           # Client API centralisé
├── types/
│   └── api.ts           # Types TypeScript backend-aligned
└── utils/               # Fonctions utilitaires
```

## 🚀 Installation et Démarrage

### Prérequis

- Node.js 18+ 
- npm ou yarn
- Backend RAG fonctionnel sur port 8000

### Installation

```bash
# Installation des dépendances
npm install

# ou avec yarn
yarn install
```

### Variables d'Environnement

Créer un fichier `.env` :

```env
# API Backend
VITE_API_BASE_URL=http://localhost:8000/api/v1

# Development
VITE_APP_NAME=RAG Chatbot
VITE_APP_VERSION=0.1.0
```

### Démarrage Développement

```bash
# Mode développement avec HMR
npm run dev
# ou
yarn dev

# Application disponible sur http://localhost:3000
```

### Build Production

```bash
# Build optimisé
npm run build
# ou 
yarn build

# Preview du build
npm run preview
# ou
yarn preview
```

## 🎨 Design System

### Palette Couleurs

```css
/* Couleurs principales */
primary: {
  50: '#f0f9ff',   /* Backgrounds subtils */
  500: '#3b82f6',  /* Couleur principale */
  600: '#2563eb',  /* Hover states */
  700: '#1d4ed8',  /* Active states */
  900: '#1e3a8a',  /* Textes emphasis */
}

/* Couleurs sémantiques */
success: green-500
warning: yellow-500  
error: red-500
info: blue-500
```

### Composants UI Standards

```css
/* Boutons */
.btn-primary: Bleu avec hover effects
.btn-secondary: Gris avec transitions
.btn-danger: Rouge pour suppressions

/* Formulaires */
.input-field: Borders + focus rings
.textarea-auto: Auto-resize intelligent

/* Cards */
.card: Shadow + hover effects + rounded borders
.card-interactive: Transformations au hover
```

### Breakpoints Responsive

```css
/* Mobile First */
sm: 640px   /* Tablet portrait */
md: 768px   /* Tablet landscape */  
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
2xl: 1536px /* Extra large */
```

## 🔧 Fonctionnalités Détaillées

### Phase 1 : Authentification ✅
- Interface Login/Register moderne
- Validation temps réel des formulaires
- Gestion d'erreurs contextuelle
- Persistance session avec localStorage
- Redirection automatique post-login

### Phase 2 : Dashboard Topics ✅  
- Vue d'ensemble topics utilisateur
- Statistiques temps réel (documents, conversations)
- Interface création topics avec permissions
- Navigation fluide vers pages détaillées
- Responsive grid adaptatif

### Phase 3 : Gestion Documents ✅
- Upload drag & drop avec validation
- Support multi-formats (PDF, Word, Excel, TXT)
- Progress tracking visuel temps réel
- Liste documents avec métadonnées complètes
- Statuts traitement (uploading → processing → ready)

### Phase 4 : Interface Chat ✅
- Chat moderne avec bulles distinctives
- Citations sources cliquables
- Historique conversationnel persistant
- Indicateurs typing pendant génération IA
- Scroll automatique + bouton retour bas
### Phase 5 : Gestion Permissions ✅ (EPIC 7)

#### Story 7.4 : Backend & Store Permissions ✅
- API Service étendu avec endpoints permissions
- Store Zustand `permissionsStore` avec actions CRUD
- Types TypeScript alignés backend (TopicPermission, PermissionLevel)
- Gestion erreurs et loading states

#### Story 7.5 : Interface Gestion Permissions ✅
- **PermissionsPanel** : Vue d'ensemble permissions par topic
  - Statistiques (Total, READ, WRITE, ADMIN)
  - Recherche et filtres par niveau
  - Liste des utilisateurs avec permissions actuelles
  
- **PermissionUserCard** : Card utilisateur individuel
  - Badge coloré selon niveau (🔍 READ, ✏️ WRITE, 🔑 ADMIN)
  - Métadonnées traçabilité (accordé par qui, quand)
  - Actions : Modifier / Révoquer (si droits suffisants)
  
- **AddPermissionModal** : Attribution nouvelle permission
  - Liste utilisateurs disponibles (sans accès actuel)
  - Recherche dynamique
  - Sélection niveau avec descriptions

- **ChangePermissionModal** : Modification permission existante
  - Radio buttons READ/WRITE/ADMIN
  - Confirmation si downgrade ADMIN
  - Empêche auto-rétrogradation

#### Architecture Intégration

**Navigation : MainContent → TopicHeader → Onglets**
```typescript
// MainContent.tsx - Routing des onglets
<TopicHeader 
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>

// Rendu conditionnel selon onglet actif
{activeTab === 'messages' && <IntegratedChat />}
{activeTab === 'files' && <KnowledgeBase />}
{activeTab === 'permissions' && <PermissionsPanel />}
```

**TopicHeader.tsx - Onglets dynamiques**
```typescript
export type TabType = 'messages' | 'files' | 'permissions'

// Onglet Permissions visible si :
const canManagePermissions = user?.role === 'admin'

{canManagePermissions && (
  <button onClick={() => onTabChange('permissions')}>
    <Shield /> Permissions
  </button>
)}
```

#### Règles d'Affichage

1. **Onglet Permissions visible** : Uniquement ADMIN global *(amélioration prévue : + ADMIN topic)*
2. **Bouton "Ajouter"** : Visible si `canManage = true`
3. **Actions Modifier/Révoquer** : Conditionnelles selon permissions utilisateur
4. **Auto-protection** : Impossible de se modifier/révoquer soi-même

#### Bugs Résolus ✅

1. **Classes CSS `bg-primary-*` manquantes** 
   - Symptôme : Boutons invisibles mais cliquables
   - Solution : Remplacement `bg-primary-600` → `bg-blue-600`
   - Fichiers : PermissionsPanel, AddPermissionModal
   
2. **Erreur 500 sur grant/update permissions**
   - Symptôme : Opération réussit en DB mais crash frontend
   - Cause : Backend SQLAlchemy lazy loading (MissingGreenlet)
   - Solution : `db.refresh(permission, ["user", "grantor"])` backend
   - Impact : UX fluide, feedback immédiat

## 🔌 Intégration API

### Configuration Axios

```typescript
// Client API centralisé avec intercepteurs
const apiService = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000
})

// Intercepteur JWT automatique
apiService.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Gestion erreurs globale
apiService.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Redirection login automatique
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

### Endpoints Intégrés

| Endpoint | Méthode | Usage Frontend |
|----------|---------|----------------|
| `/auth/login` | POST | Connexion utilisateur |
| `/auth/register` | POST | Inscription utilisateur |
| `/auth/me` | GET | Profil utilisateur |
| `/topics` | GET/POST | Liste + création topics |
| `/topics/{id}` | GET/PATCH | Détail + modification topic |
| `/documents/upload` | POST | Upload avec FormData |
| `/documents` | GET | Liste documents par topic |
| `/chat` | POST | Création conversation |
| `/chat/{id}/messages` | POST | Envoi message + réponse IA |
| `/topics/{id}/permissions` | GET/POST | Liste + attribution permissions |
| `/topics/{id}/permissions/{user_id}` | PATCH/DELETE | Modifier/Révoquer permission |
| `/topics/{id}/available-users` | GET | Users disponibles pour topic |
| `/users` | GET | Liste utilisateurs (ADMIN) |
| `/users/{id}` | GET/PATCH | Détail/modification user |
| `/users/{id}/role` | PATCH | Changement rôle (ADMIN) |

## 🎯 Gestion d'État

### Zustand Stores Pattern

```typescript
// Pattern store standardisé
interface Store {
  // État métier
  items: Item[]
  currentItem: Item | null
  
  // États UI
  isLoading: boolean
  error: string | null
  
  // Actions
  fetchItems: () => Promise<void>
  createItem: (data: CreateData) => Promise<Item>
  updateItem: (id: string, data: UpdateData) => Promise<Item>
  clearError: () => void
}
```

### Optimistic Updates

```typescript
// Mise à jour optimistic pour UX fluide
const createItem = async (data: CreateData) => {
  // 1. Ajout immédiat UI
  const tempItem = { id: `temp-${Date.now()}`, ...data }
  set(state => ({ items: [...state.items, tempItem] }))
  
  try {
    // 2. Appel API
    const newItem = await api.createItem(data)
    
    // 3. Remplacement par données serveur
    set(state => ({
      items: state.items.map(item => 
        item.id === tempItem.id ? newItem : item
      )
    }))
  } catch (error) {
    // 4. Rollback si erreur
    set(state => ({
      items: state.items.filter(item => item.id !== tempItem.id),
      error: error.message
    }))
  }
}
```

## 🧪 Tests et Validation

### Types de Tests

```bash
# Tests unitaires composants
npm run test

# Tests e2e avec Playwright (à implémenter)
npm run test:e2e

# Linting et formatage
npm run lint
npm run lint:fix
```

### Validation Manuelle

```bash
# 1. Authentification
- Inscription nouvel utilisateur ✓
- Connexion avec credentials valides ✓  
- Redirection automatique si non connecté ✓

# 2. Navigation
- Dashboard → Topic detail ✓
- Topic detail → Documents/Chat tabs ✓
- Breadcrumb navigation ✓

# 3. Upload documents
- Drag & drop fonctionnel ✓
- Validation types fichiers ✓
- Progress tracking ✓

# 4. Chat interface  
- Questions/réponses fonctionnelles ✓
- Sources citées cliquables ✓
- Historique persistant ✓
```

## 📊 Métriques Performance

### Métriques Actuelles

- **Bundle Size** : ~800KB (gzipped ~200KB)
- **First Paint** : < 1 seconde
- **Time to Interactive** : < 2 secondes
- **Navigation** : < 500ms transitions

### Optimisations Appliquées

- Code splitting par routes
- Lazy loading composants lourds
- Debouncing sur recherches
- Virtualisation listes longues (préparé)
- Images optimisées WebP

## 🔐 Sécurité Frontend

### Mesures Implémentées

- **Validation Input** : Sanitisation côté client + serveur
- **XSS Protection** : Pas de dangerouslySetInnerHTML
- **CSRF Protection** : SameSite cookies + CORS strict
- **Token Management** : Expiration + refresh automatique
- **Route Protection** : Guards sur routes sensibles

### Variables d'Environnement

```env
# Jamais commiter de secrets dans .env
# Utiliser .env.local pour development
# Variables VITE_ exposées côté client uniquement
```

## 📱 Responsive Design

### Mobile (< 768px)
- Navigation hamburger
- Stacking vertical des éléments
- Touch-friendly boutons (44px minimum)
- Formulaires full-width

### Tablet (768px - 1024px)  
- Layout 2 colonnes adaptatif
- Navigation hybride
- Grids responsives

### Desktop (> 1024px)
- Layout 3 colonnes optimal
- Sidebar persistante
- Hover effects riches

## 🚀 Déploiement

### Build Production

```bash
# Build optimisé
npm run build

# Vérification build
npm run preview

# Assets générés dans /dist
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── [autres assets]
└── [fichiers statiques]
```

### Variables Production

```env
# .env.production
VITE_API_BASE_URL=https://api.yourdomain.com/api/v1
VITE_APP_NAME=RAG Chatbot
```

### Déploiement Statique

```bash
# Netlify/Vercel
npm run build
# Upload dossier /dist

# Nginx
server {
  root /var/www/rag-chatbot-frontend/dist;
  index index.html;
  
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

## 📋 Roadmap

### v0.1 (Corrections MVP)
- 🔄 Amélioration gestion erreurs
- 🔄 Optimisation performance mobile
- 🔄 Tests automatisés complets

### v0.1.1 (Permissions Granulaires) ✅
- ✅ Interface gestion permissions par topic
- ✅ Attribution READ/WRITE/ADMIN granulaire
- ✅ Traçabilité complète (qui, quand)
- ✅ Corrections bugs CSS + SQLAlchemy

### v0.2 (UX Améliorée)  
- ⏳ Mode sombre/clair
- ⏳ Notifications toast
- ⏳ Raccourcis clavier
- ⏳ Export conversations

### v1.0 (Production Ready)
- ⏳ PWA (offline capabilities) 
- ⏳ Internationalisation (i18n)
- ⏳ Analytics intégrées
- ⏳ Monitoring erreurs

### v1.1+ (Fonctionnalités Avancées)
- ⏳ Mode vocal (speech-to-text)
- ⏳ Collaboration temps réel
- ⏳ Themes personnalisables
- ⏳ Plugins/extensions

## 🤝 Développement

### Structure Commits

```
feat: nouvelle fonctionnalité
fix: correction bug
ui: améliorations interface
perf: optimisation performance
refactor: refactoring code
docs: documentation
test: tests
chore: maintenance
```

### Scripts Disponibles

```bash
npm run dev          # Développement avec HMR
npm run build        # Build production
npm run preview      # Preview du build
npm run lint         # ESLint check
npm run lint:fix     # ESLint fix automatique
npm run type-check   # Vérification TypeScript
```

## 🐛 Issues Résolues ✅

1. ~~**Boutons permissions invisibles**~~ → **RÉSOLU v0.1.1**
   - Classes Tailwind `primary-*` non configurées
   - Solution : Migration vers `blue-*` ou config Tailwind

2. ~~**Erreur 500 attribution permissions**~~ → **RÉSOLU v0.1.1**  
   - Backend lazy loading SQLAlchemy
   - Frontend affichait erreur malgré succès DB
   - Solution : Eager loading relations côté backend

3. ~~**TopicDetailPage jamais utilisé**~~ → **RÉSOLU v0.1.1**
   - Architecture réelle : MainContent + TopicHeader
   - Correction navigation et intégration onglets

## 🐛 Issues Connues ⚠️

1. **Manager ADMIN topic** : Ne voit pas onglet Permissions (basé sur rôle global)
2. **Upload gros fichiers** : Progress bar peut freezer >50MB
3. **Mobile landscape** : Layout améliorable pour tablettes
4. **Sources citées** : Métadonnées parfois nulles (dépend backend)

## 📞 Support

### Développement Local

```bash
# Problèmes courants
rm -rf node_modules package-lock.json
npm install  # Réinstallation propre

# Clear cache Vite
rm -rf .vite
npm run dev

# Debug réseau
# Vérifier VITE_API_BASE_URL dans .env
# Tester API directement : curl http://localhost:8000/health
```


**Version** : v0.1.1 (Permissions Granulaires)
**Date** : 31 Octobre 2025  
**Statut** : MVP Fonctionnel + RBAC Complet
