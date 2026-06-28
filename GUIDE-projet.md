# GUIDE DU PROJET — Trading Desk Attijariwafa Bank
### Desk International — Fixed Income

> Mémo pour **comprendre et défendre** le projet sans avoir à lire chaque ligne.
> À relire avant la soutenance. Aucun code n'est modifié par ce document.

---

## 1. C'est quoi ce projet, en une phrase ?

Une **salle de marché numérique** pour le desk obligataire international d'Attijariwafa Bank :
elle suit en temps réel les **positions** (ce que la banque détient), calcule les **gains/pertes
(P&L)**, mesure le **risque** (taux d'intérêt), aide à la **décision d'achat/vente**, et
**réconcilie** les données du Front Office avec celles du Back Office.

---

## 2. L'architecture en une image

```
┌─────────────────────────────────────────────────────────────┐
│  NAVIGATEUR (l'utilisateur)                                   │
│                                                               │
│   React (un écran : Dashboard, Risk, Blotter, Recon...)       │
│        │                                                      │
│        │  axios  →  GET/POST /api/xxx                         │
│        ▼                                                      │
│   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ proxy Vite (:5173 → :8081) ─ ─ ─ ─ ─    │
└────────�│──────────────────────────────────────────────────-─┘
         ▼
┌─────────────────────────────────────────────────────────────┐
│  BACKEND Spring Boot (port 8081)                              │
│                                                               │
│   CONTROLLER   reçoit la requête  (/api/dashboard…)           │
│        │                                                      │
│        ▼                                                      │
│   SERVICE      fait le CALCUL  ◄── LE SEUL endroit important   │
│        │                                                      │
│        ▼                                                      │
│   REPOSITORY   lit / écrit la base                            │
│        │                                                      │
│        ▼                                                      │
│   PostgreSQL   (trading_db)                                   │
└─────────────────────────────────────────────────────────────┘

         + WebSocket (/ws) : pousse les prix de marché en TEMPS RÉEL
```

**À retenir :** tout le projet, du premier au dernier fichier, n'est que la
**répétition de ce voyage**. Quand tu comprends ce flux, tu peux lire n'importe quel fichier.

---

## 3. Le flux détaillé (exemple concret)

> « J'ouvre l'écran Portfolio, je vois le P&L total. D'où vient ce chiffre ? »

```
1. React          PortfolioView s'affiche
2. axios          api.dashboard.getGlobal()  →  GET /api/dashboard/global
3. Controller     DashboardController reçoit, appelle le service
4. Service        GlobalDashboardService additionne Eurobonds + CLN + EGP
                  (et appelle PnlService / RiskService pour les détails)
5. Repository     lit les positions et prix en base
6. ← réponse      JSON { totalPlEcoMad: 102453317, ... }
7. React          le chiffre s'affiche à l'écran
```

---

## 4. Ce que tu DOIS maîtriser vs ce qui est "boîte noire"

| Partie | À maîtriser ? | Pourquoi |
|---|---|---|
| **Le flux ci-dessus** | 🔴 OUI | C'est la base de tout |
| **Calculs métier** (P&L, DV01, hedge, recon) | 🔴 OUI | C'est le cœur du PFE |
| **Controllers** | 🟠 Survol | Un seul schéma répété |
| **Repositories** | 🟢 Boîte noire | « ça lit/écrit la base » |
| **Entities / DTO** | 🟢 Boîte noire | « ce sont les formes des données » |
| **Composants front** (graphes) | 🟢 Boîte noire | « ça affiche les données » |
| **Config** (Keycloak, WebSocket) | 🟢 1 phrase | voir section 7 |

👉 **Concentre 80 % de ton effort sur les lignes 🔴.** Le reste s'explique « par pattern ».

---

## 5. Le vocabulaire des couches (backend)

| Couche | Rôle (en français simple) | Annotation Spring |
|---|---|---|
| **Controller** | La porte d'entrée web. Reçoit, délègue, renvoie. Ne calcule rien. | `@RestController` |
| **Service** | Le cerveau. Contient TOUS les calculs métier. | `@Service` |
| **Repository** | Le pont vers la base. Lit/écrit sans SQL manuel. | `@Repository` |
| **Entity** | Une ligne de table transformée en objet Java. | `@Entity` |
| **DTO** | La "forme" des données envoyées au frontend. | (classe simple) |

**Le schéma unique d'un controller** (vrai pour les 11) :
```
@RestController
@RequestMapping("/api/xxx")          ← mon adresse
@RequiredArgsConstructor             ← Spring me donne mes services

@GetMapping     → LIRE      : délègue au service, renvoie
@PostMapping    → CRÉER
@PutMapping     → MODIFIER
@DeleteMapping  → SUPPRIMER
```
Les blocs `try { auditService.log(...) }` = juste « écrire qui a fait l'action
dans le journal ». **Ignore-les** pour comprendre la logique principale.

---

## 6. Les 5 calculs métier à connaître (le cœur du PFE)

### a) WAP — Prix de revient moyen
```
WAP = Σ(nominal_achat × prix) / Σ(nominal_achat)
```
**Métier :** ton prix d'achat moyen. La référence pour savoir si tu gagnes ou perds.
*(Seuls les achats comptent ; vendre ne change pas ton prix de revient.)*

### b) P&L Économique — LE chiffre clé
```
P&L Économique = (P&L latent + réalisé + coupons) en MAD − coût de financement
```
**Métier :** ton **vrai** profit. Détenir une obligation coûte de l'argent
(on emprunte du cash pour l'acheter) ; le P&L économique retire ce coût.

### c) DV01 — La sensibilité au risque de taux
```
DV01 = duration × nominal × 0.0001
```
**Métier :** combien je gagne/perds si les taux bougent de 1 point de base (0,01 %).
C'est la mesure de risque n°1 d'un desk obligataire.

### d) Hedge ratio — La couverture
```
nb_contrats_futures = DV01_obligation / DV01_d'un_future
```
**Métier :** combien de contrats futures vendre pour **neutraliser** le risque de taux
de l'obligation. Si les taux bougent, la perte sur l'obligation est compensée par le future.

### e) Réconciliation FO/BO — Le sujet central
```
On compare deux sources indépendantes :
  Front Office (le blotter du trader)  vs  Back Office (le règlement/compta)
→ 4 résultats : MATCHED / écart / présent au FO seul / présent au BO seul
```
**Métier :** si Front et Back ne sont pas d'accord = erreur de saisie, trade manquant,
ou risque de fraude. C'est une **exigence réglementaire** dans toute banque.

---

## 7. La configuration en 1 phrase chacune

- **Keycloak** (`SecurityConfig`, `keycloak.js`) : gère l'authentification (login SSO de
  la banque). En local, le **profil `dev`** désactive Keycloak pour développer/tester.
- **WebSocket** (`WebSocketConfig`, `wsService.js`) : pousse les **prix de marché en temps
  réel** vers le navigateur (canal `/ws`, topics `/topic/market`, `/topic/heartbeat`).
- **Proxy Vite** (`vite.config.js`) : en dev, redirige `/api/*` du front (:5173) vers le
  backend (:8081) → évite les problèmes de CORS.

---

## 8. Liste des écrans (frontend) et leur source de données

| Écran | Endpoint backend principal |
|---|---|
| Portfolio / Dashboard global | `/api/dashboard/global` |
| Blotter (liste des trades) | `/api/trades` |
| Eurobonds | `/api/dashboard`, `/api/pricing` |
| Risk | `/api/risk` |
| CLN / EGP | `/api/external/cln`, `/api/external/egp` |
| T-Bills | `/api/tbills` |
| Reporting (courbe P&L) | `/api/pnl-daily/history` |
| Réconciliation | `/api/recon/run` |
| Admin (traders, limites, audit) | `/api/admin/*` |

---

## 9. Comment lancer le projet (rappel)

**Backend** (mode local sans Keycloak) :
```
mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```
Vérifier dans les logs : `The following 1 profile is active: "dev"`

**Frontend** :
```
npm install
npm run dev          → http://localhost:5173
```

**Vérifier que le backend répond** : ouvrir `http://localhost:8081/swagger-ui`

---

## 10. Questions probables en soutenance + réponses

**« Explique l'architecture. »**
→ Frontend React + backend Spring Boot en couches (Controller → Service → Repository →
PostgreSQL), communication REST via axios + WebSocket pour le temps réel.

**« Où sont les calculs ? »**
→ Uniquement dans les **services**. Les controllers ne font que recevoir et renvoyer.

**« C'est quoi le P&L économique ? »**
→ Le vrai profit = P&L comptable moins le coût de financement de la position.

**« Pourquoi pas de AuthController ? »**
→ L'authentification est déléguée à **Keycloak** (standard bancaire), donc inutile.

**« Comment tu sais que l'API marche ? »**
→ Les 40+ endpoints ont été testés (réponses 200/204), 2 bugs trouvés et corrigés
(date de trade par défaut, fallback pricing par ISIN).

---

*Fin du guide. Relis les sections 2, 3 et 6 en priorité — c'est 80 % de ce qu'on te demandera.*
