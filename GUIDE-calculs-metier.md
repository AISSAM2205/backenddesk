# GUIDE DÉTAILLÉ — CALCULS FINANCIERS
### Trading Desk Attijariwafa Bank — Desk International Fixed Income

> Document de référence pour **maîtriser tous les calculs** du projet.
> Chaque formule est **fidèle au code réel** (fichier + méthode indiqués).
> Aucun code n'est modifié par ce document.

---

## ⚠️ À LIRE EN PREMIER — Il existe DEUX moteurs de calcul

C'est le point le plus important à comprendre (et une question probable du jury) :

| Moteur | Fichier | Rôle |
|---|---|---|
| **Backend** | `service/PnlService.java` | Calcule le P&L **par position**, à une date, depuis la base |
| **Frontend** | `contexts/TradingContext.jsx` → `enrichCarry()` | **Recalcule tout en MAD** de façon cohérente côté client |

**Pourquoi deux ?** Le commentaire du code l'explique : le frontend recalcule tout en MAD
pour éviter trois pièges (unités EGP cassées, carry qui devient négatif à tort, coupons YTD
non agrégés). Le frontend est donc la **source de vérité affichée** ; le backend fournit les
briques de base. Les deux utilisent les **mêmes principes**, avec une petite nuance sur le
« theta » (voir §6).

👉 En soutenance : « Le backend calcule le P&L par position ; le frontend le consolide en MAD
pour garantir la cohérence multi-devises. »

---

## 1. Les conventions de marché utilisées (vocabulaire pro)

Avant les formules, le vocabulaire — le jury appréciera que tu les connaisses :

| Terme | Signification |
|---|---|
| **Clean price** | Prix coté de l'obligation, **hors** coupon couru |
| **Accrued** | Coupon **couru** (accumulé depuis le dernier paiement) |
| **Dirty price** | `clean + accrued` = ce qu'on paie réellement |
| **Nominal** | Montant de la position (ex : 73 460 000 USD) |
| **bp (point de base)** | 0,01 % = 0.0001. Unité reine des taux et spreads |
| **FX** | Taux de change devise → MAD (dirham) |
| **ACT/365** | Convention pour les **coupons** : on divise l'année par 365 |
| **ACT/360** | Convention pour le **financement** (repo) : on divise par 360 |
| **YTM** | Yield To Maturity = rendement à maturité |
| **MtM** | Mark-to-Market = valeur à prix de marché |

**Conversion des devises en MAD** (dirham marocain) :
```
USD → usdMad
EUR → eurMad
EGP → usdMad / usdEgp     (on passe par l'USD : EGP/MAD = (USD/MAD) ÷ (USD/EGP))
```

**Coût de financement (repo)** selon la devise :
```
USD → taux SOFR
EUR → taux ESTR
EGP → 0   (les T-bills égyptiens ne sont pas financés en repo)
```
> Les taux SOFR/ESTR sont stockés en % (ex : 5.33) → le code **divise par 100**.

---

## 2. WAP — Prix de revient moyen pondéré
**Fichier : `WapCalculatorService.calculateWapDirty()`**

### Formule
```
WAP = Σ(nominal_achat × prix_dirty) / Σ(nominal_achat)
```

### Implémentation (ce que fait le code, étape par étape)
1. Récupère **uniquement les trades BUY** de cet ISIN, triés du plus ancien au plus récent.
2. Pour chaque achat : si le `dirtyPrice` est absent → le reconstruit = `clean + accrued`.
3. Accumule `Σ(nominal × dirty)` et `Σ(nominal)`.
4. Divise l'un par l'autre, avec une précision de 10 décimales (`scale=10`).

### Règles importantes
- ⚠️ **Seuls les achats (BUY) comptent.** Les ventes (SELL) **n'entrent pas** dans le WAP :
  vendre ne change pas ton prix de revient moyen.
- Si aucun achat → WAP = 0.

### Signification métier
C'est ton **prix d'achat moyen**. Si tu achètes 10M à 1.00 puis 30M à 1.04, ton WAP n'est pas
1.02 mais ≈ **1.03** (tu as acheté plus cher en plus grande quantité). C'est la **référence**
pour mesurer ton gain.

### Exemple réel (validé contre l'Excel du desk)
```
MOROC 5.95  →  WAP dirty = 1.030299202909292
```

---

## 3. P&L Réalisé — le gain encaissé à la vente
**Fichier : `WapCalculatorService.calcRealizedPnl()`**

### Formule
```
P&L réalisé = (prix_vente_dirty − WAP_dirty) × nominal_vendu
```

### Signification métier
Le gain **réellement encaissé** quand tu vends : la différence entre ton prix de vente et ton
prix de revient (WAP), multipliée par la quantité vendue. « Réalisé » = c'est dans la poche,
plus de risque de marché dessus.

### Exemple réel
```
SELL 20 000 000 MOROC 5.95 @ dirty=1.06562, WAP=1.027455
P&L = (1.06562 − 1.027455) × 20 000 000 = +763 291 USD
```

---

## 4. MtM d'un future — la valorisation de la couverture
**Fichier : `WapCalculatorService.calcFutureMtm()`**

### Formule (exactement ce que calcule le code)
```
base = (prix_actuel − prix_entrée) × nb_contrats × taille_contrat / 100

MtM = base            si le sens est SELL
MtM = −base           si le sens est BUY   (signe inversé)
```

### Signification métier
Un future sert à **se couvrir** (hedge). La convention de signe du code est faite pour qu'une
position **vendeuse (SELL)** de futures **compense** une obligation détenue : quand les taux
montent, le prix des futures baisse, et la position SELL apporte un résultat qui **neutralise**
la perte sur l'obligation. C'est le principe de la couverture (voir §7-d).

---

## 5. P&L par position (BACKEND) — les 7 formules
**Fichier : `PnlService.compute()`** — appelé pour **chaque** obligation, à une date donnée.

### Étape par étape
```
FORMULE 1 — Dirty marché
   dirty_marché = px_mid + accrued
   → la valeur actuelle du titre sur le marché aujourd'hui

FORMULE 2 — Performance vs WAP
   perf_WAP = dirty_marché − WAP        (seulement si position > 0)
   → de combien le prix a bougé depuis ton achat

FORMULE 3 — P&L Latent (en devise)
   P&L_latent = nominal × perf_WAP
   → gain "sur le papier" (pas encore vendu). Latent = potentiel

FORMULE 4 — Coupons reçus (en devise)
   coupons = Σ des coupons déjà encaissés (table coupon_received)
   → l'argent des intérêts déjà touchés

FORMULE 5 — P&L Total (en devise)
   P&L_total = P&L_latent + P&L_réalisé + coupons

FORMULE 6 — P&L Comptable (en MAD)
   P&L_comptable_MAD = P&L_total × FX
   → converti en dirhams (la banque publie en MAD)

FORMULE 7 — Coût de financement (en MAD)
   jours = (jour de l'année) − 1           (jours écoulés depuis le 1er janvier)
   financement = nominal × taux_repo × jours / 360 × FX
   → le coût d'emprunt du cash pour financer la position (ACT/360)
```

### Le résultat clé
```
P&L ÉCONOMIQUE = P&L Comptable MAD − Financement
```
**Signification métier — C'EST LE CHIFFRE LE PLUS IMPORTANT.** Détenir une obligation **coûte**
de l'argent (on emprunte du cash pour l'acheter). Le P&L **comptable** ignore ce coût ; le P&L
**économique** le retire → c'est ton **vrai** profit.

### Net Daily — le carry du jour
```
Coupon Theta journalier = (taux_coupon / 100 × nominal) / 365 × FX      (ACT/365)
Financement journalier   = (taux_repo / 100 × nominal) / 360 × FX        (ACT/360)

Net Daily = Coupon Theta − Financement journalier
```
**Signification :** est-ce que **garder** la position **aujourd'hui** rapporte ou coûte ?
- Net Daily **positif** → le coupon accumulé > le coût de financement → tu gagnes à attendre.
- Net Daily **négatif** → `netDailyAlert = true` ⚠️ → la position **saigne** chaque jour.

> Note convention : coupons en **365**, financement en **360** — ce sont les vraies
> conventions de marché (ACT/365 et ACT/360).

---

## 6. Consolidation en MAD (FRONTEND) — `enrichCarry()`
**Fichier : `contexts/TradingContext.jsx`**

Le frontend reprend les briques du backend et **recalcule tout en MAD** de façon homogène.
C'est ce qui s'affiche réellement à l'écran.

### Les formules (par ligne du portefeuille)
```
fx        = EUR→eurMad ; EGP→usdMad/usdEgp ; sinon usdMad
fundRate  = EGP→0 ; EUR→estr ; sinon sofr
nominal   = |netNominal|                          (valeur absolue)
ytm       = yieldToMaturity, sinon couponRate     (proxy si YTM absent)

— Carry journalier —
cpnThetaMad      = (ytm / 100 × nominal) / 365 × fx
dailyFundingMad  = (fundRate / 100 × nominal) / 360 × fx
netDailyMad      = cpnThetaMad − dailyFundingMad
netDailyAlert    = (netDailyMad < 0)

— P&L économique YTD (depuis le début d'année) —
latentMad        = pnlLatentCcy × fx
realizedMad      = pnlRealizedCcy × fx
couponsYtdMad    = (couponRate / 100 × nominal) × (jours_écoulés / 365) × fx
fundingYtdMad    = (fundRate / 100 × nominal) × (jours_écoulés / 360) × fx
pnlAccountingMad = latentMad + realizedMad + couponsYtdMad
pnlEconomicMad   = pnlAccountingMad − fundingYtdMad

— Projection fin d'année —
expectedEcoPnlYe = pnlEconomicMad + netDailyMad × jours_restants_année

— Nominal homogène en USD (pour additionner EUR/EGP/USD) —
netNominalUsd    = (nominal × fx) / usdMad
```

### La nuance backend ↔ frontend (à connaître)
- **Backend** `cpnTheta` utilise le **taux de coupon**.
- **Frontend** `cpnTheta` utilise le **YTM (rendement)**, pas seulement le coupon cash.

**Pourquoi ?** (commentaire du code) : en base rendement, `Theta − Financement = Net Daily`
se réconcilie partout, et les obligations **décotées** (coupon bas mais rendement élevé) ne
sont plus à tort en carry négatif. C'est un **choix d'ingénierie financière** assumé.

### Consolidation globale — `computeGlobal()`
Additionne toutes les lignes :
```
totalPlEcoMad     = Σ pnlEconomicMad
totalNetDailyMad  = Σ netDailyMad
totalCpnThetaMad  = Σ cpnThetaMad
totalFundingMad   = Σ fundingCostMad
duration_portef.  = Σ(modDuration × netNominal) / Σ(netNominal)   (moyenne pondérée)
```

---

## 7. Le RISQUE — DV01, hedge, duration
**Fichier : `RiskService.java`**

### a) DV01 d'une obligation
```
DV01_bond = duration_modifiée × nominal × 0.0001
```
**Signification :** « Dollar Value of 1 basis point » = combien je gagne/perds si les taux
bougent de **1 point de base** (0,01 %). C'est la mesure de risque **n°1** d'un desk de taux.
Plus la duration est longue, plus le titre est sensible.

### b) DV01 d'un contrat future
```
DV01_future = duration_CTD × facteur_conversion × taille_contrat × 0.0001
```
**Signification :** la même sensibilité, mais pour **un seul** contrat future.
*(CTD = « Cheapest To Deliver », l'obligation de référence du future.)*

### c) Hedge ratio — combien de contrats pour couvrir
```
ratio       = DV01_bond / DV01_future
nb_contrats = arrondi(ratio)
```
**Signification — le cœur de la couverture.** Pour **neutraliser** le risque de taux de
l'obligation, on vend assez de futures pour que leur DV01 compense celui de l'obligation.
Le service compare ensuite ce nombre **théorique** à la position future **réelle**
(lue depuis la table `trade`) → c'est ce qui alimente la jauge de couverture du frontend.

### d) Duration du portefeuille
```
exposition_MAD          = nominal × FX
Duration_portefeuille   = Σ(duration × exposition_MAD) / Σ(exposition_MAD)
```
**Signification :** la duration **moyenne pondérée** de tout le book. Une grosse position
longue pèse plus dans la moyenne. C'est la sensibilité **globale** du desk aux taux, suivie
contre une **limite réglementaire** (`maxDurationYears`).

### Exemple réel (référence Excel du desk)
```
MOROC 5.95 : DV01 ≈ 18 532 ,  future de couverture = FVH5 Comdty,  nb contrats ≈ 461
```

---

## 8. PRICING — la décision d'achat
**Fichier : `PricingService.compute()`**

### a) G-Spread Mid
```
G-Spread Mid = (G-Spread Bid + G-Spread Ask) / 2
```
**Signification :** le **spread** = le rendement supplémentaire de l'obligation **au-dessus**
de la courbe d'État sans risque. Plus le spread est large, plus l'obligation est « bon marché ».

### b) Décision BUY / HOLD
```
Si une décision est déjà enregistrée (choix du trader)  →  on la RESPECTE
Sinon :
   Si G-Spread Bid > Target Spread  →  BUY   (titre sous-évalué)
   Sinon                            →  HOLD
```
**Signification :** la *target* est l'objectif de juste valeur. Si le marché offre un spread
**plus large** que la cible, l'obligation est **trop décotée** → opportunité d'**achat**.
⚠️ Détail malin : si le trader a choisi manuellement une décision, le code ne l'écrase **pas**
à chaque rafraîchissement.

### Exemples réels (Dashboard Excel 20/05/2025)
```
MOROC 5.95 : G=136.65 < Target=140.38  →  HOLD
OCPMR 6.1  : G=202.89 > Target=134.54  →  BUY
```

---

## 9. DASHBOARD GLOBAL — la consolidation du desk
**Fichier : `GlobalDashboardService.buildGlobal()`**

### Agrégation des 3 poches
```
Total P&L Éco = Eurobonds + CLN + EGP Bills
```
**Signification — la vue chef de desk.** Les Eurobonds sont calculés ligne par ligne ; les CLN
et EGP Bills sont des **snapshots** de desks externes. Tout est converti en MAD.

### Part de chaque poche (camembert)
```
% = nominal_poche / nominal_total × 100
```
**Signification :** la **répartition** du portefeuille (concentration) — sert au donut chart.

---

## 10. RÉCONCILIATION FO/BO — le cœur du PFE
**Fichier : `ReconciliationService.run()`**

Confronte **deux sources indépendantes** :
- **Front Office** (table `trade`) = le blotter du trader
- **Back Office** (table `bo_trade`) = le règlement / la comptabilité

### a) Matching au niveau TRADE (algorithme « greedy »)
Pour chaque trade FO, on cherche dans le BO le trade **du même ISIN et même sens (BUY/SELL)**
avec le **nominal le plus proche**, et on le « consomme » (appariement un-à-un). Résultat :
```
MATCHED              → tout concorde ✅
MATCHED_WITH_DIFF    → apparié mais avec un écart (nominal, prix, ou date)
UNMATCHED_FO         → présent au Front Office, absent du Back Office
UNMATCHED_BO         → présent au Back Office, absent du Front Office
```

### b) Écart de prix en points de base
```
delta_bps = (prix_FO − prix_BO) × 10 000
```
Avec des **tolérances** : sous la tolérance (ex : 1 bp) = accepté ; au-dessus = **break**.

### c) Matching au niveau POSITION (net par ISIN)
```
montant_signé = +nominal si BUY , −nominal si SELL
net_FO(isin)  = Σ des montants signés du Front Office
net_BO(isin)  = Σ des montants signés du Back Office
delta         = net_FO − net_BO        (break si |delta| > tolérance)
```
**Signification :** même si trade par trade ça matche, on vérifie que la **position nette**
par ISIN est identique des deux côtés.

### d) Les KPIs de synthèse
```
Taux de matching = matched / total × 100
Notionnel en écart = Σ |delta| (diffs) + Σ |nominal| (non appariés)
Écarts ouverts / résolus = suivi du workflow d'investigation
```
**Signification — pourquoi c'est crucial :** si Front et Back **ne sont pas d'accord**, c'est
une **erreur de saisie, un trade manquant, ou un risque de fraude**. La réconciliation
automatique détecte ces écarts → c'est une **exigence réglementaire** bancaire.

> Le `seedDemoBoFromFo()` génère un jeu BO de démo avec des écarts **volontaires** (un trade
> omis, un de prix +20 bps, un de quantité +500k, un trade « fantôme ») pour montrer les 4 cas.

---

## 11. Tableau récapitulatif — formule → fichier

| Calcul | Formule courte | Fichier |
|---|---|---|
| WAP | Σ(nom×dirty)/Σ(nom), BUY only | `WapCalculatorService` |
| P&L réalisé | (vente − WAP) × nominal | `WapCalculatorService` |
| MtM future | (last − entry) × n × taille / 100 | `WapCalculatorService` |
| P&L latent | nominal × (dirty − WAP) | `PnlService` |
| P&L économique | comptable MAD − financement | `PnlService` |
| Net Daily | theta − financement journalier | `PnlService` / `enrichCarry` |
| Consolidation MAD | tout × FX, agrégé | `enrichCarry` (front) |
| DV01 bond | duration × nominal × 0.0001 | `RiskService` |
| DV01 future | dur_CTD × convFactor × taille × 0.0001 | `RiskService` |
| Hedge ratio | DV01_bond / DV01_future | `RiskService` |
| Duration portef. | Σ(dur×expo)/Σ(expo) | `RiskService` |
| G-Spread Mid | (bid + ask) / 2 | `PricingService` |
| Décision BUY/HOLD | gSpreadBid > target ? BUY : HOLD | `PricingService` |
| Total desk | Eurobonds + CLN + EGP | `GlobalDashboardService` |
| % portefeuille | nominal / total × 100 | `GlobalDashboardService` |
| Recon prix bps | (foPrice − boPrice) × 10000 | `ReconciliationService` |
| Recon net position | net_FO − net_BO (signé) | `ReconciliationService` |
| Taux de matching | matched / total × 100 | `ReconciliationService` |

---

## 12. Glossaire express (pour la soutenance)

- **WAP** : prix de revient moyen (achats uniquement).
- **Dirty / Clean** : avec / sans coupon couru.
- **P&L latent** : gain non encore réalisé (sur le papier).
- **P&L réalisé** : gain encaissé après vente.
- **P&L économique** : vrai profit = comptable − coût de financement.
- **Carry / Net Daily** : gain ou coût de **garder** la position un jour de plus.
- **DV01** : perte/gain pour un mouvement de taux de 1 bp.
- **Duration** : sensibilité d'un titre aux taux (en années).
- **Hedge** : couverture par futures pour annuler le risque de taux.
- **G-Spread** : rendement au-dessus de la courbe d'État (mesure de cherté).
- **Réconciliation** : comparaison Front Office ↔ Back Office.

---

*Fin du guide. Priorité de révision : §5 (P&L), §7 (risque/hedge), §10 (réconciliation).
Ce sont les trois sujets sur lesquels le jury creusera le plus.*
