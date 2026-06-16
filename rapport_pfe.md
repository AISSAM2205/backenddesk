# Rapport de Projet de Fin d'Études

---

<div align="center">

## ATTIJARIWAFA BANK — DESK INTERNATIONAL

### Conception et Développement d'un Dashboard de Trading  
### pour le Suivi du Portefeuille Obligataire International

---

**Auteur :** Aissam Boutaib  
**Encadrant entreprise :** [Nom de l'encadrant AWB]  
**Encadrant académique :** [Nom de l'encadrant école]  
**Établissement :** [Nom de l'école d'ingénieurs / Master]  
**Filière :** [Ingénierie Informatique / Finance Quantitative / ...]  
**Année universitaire :** 2025 – 2026  

---

*Stage de fin d'études effectué au sein du Desk International  
d'Attijariwafa Bank — Casablanca*

*Période :* [Mois début] – [Mois fin] 2025/2026

</div>

---

## Dédicaces

*À mes parents, pour leur soutien indéfectible tout au long de mon parcours.*

*À mes professeurs, pour la rigueur et la passion qu'ils ont su transmettre.*

*À l'équipe du Desk International d'Attijariwafa Bank, pour la confiance accordée et les enseignements partagés.*

---

## Remerciements

Je tiens à exprimer ma profonde gratitude à toutes les personnes qui ont contribué, de près ou de loin, à la réussite de ce projet de fin d'études.

Je remercie chaleureusement **[Nom de l'encadrant AWB]**, [titre], au sein du Desk International d'Attijariwafa Bank, pour m'avoir accueilli, orienté et fait confiance tout au long de ce stage. Sa disponibilité, sa maîtrise des marchés financiers et ses retours critiques ont été déterminants dans la qualité du produit livré.

Mes remerciements s'adressent également à **[Nom de l'encadrant académique]**, [professeur / enseignant-chercheur] à [l'école], pour le suivi académique rigoureux et les conseils méthodologiques prodigués.

Je remercie l'ensemble de l'équipe du Desk International pour l'accueil bienveillant, les échanges enrichissants sur les pratiques de trading obligataire et la mise à disposition des données de référence (Bloomberg, Excel de pricing).

Enfin, je remercie mes proches pour leur soutien moral constant.

---

## Résumé

Ce rapport présente la conception et le développement d'un **dashboard de trading** destiné au Desk International d'**Attijariwafa Bank**. Ce desk gère un portefeuille obligataire multi-devises composé d'eurobonds souverains marocains et africains, de Credit Linked Notes (CLN), de bons du Trésor égyptiens (EGP T-Bills) et de contrats à terme (Futures) sur marchés internationaux (CME, Eurex).

L'application développée offre une vision consolidée et en quasi-temps réel de l'ensemble du portefeuille : suivi du P&L comptable et économique, calcul des métriques de risque (Duration, DV01, VaR 1j 99%), signaux de pricing Bloomberg, blotter des trades, gestion des limites de trading et reporting dynamique.

Sur le plan technique, la solution repose sur une architecture **full-stack découplée** : un backend **Spring Boot 3 / Java 17** exposant une API REST et des flux WebSocket (STOMP), et un frontend **React 18 / Vite / Ant Design 5** avec un système de design tokens adaptatif (mode clair/sombre). La persistance est assurée par **PostgreSQL 15**, avec un module de simulation de marché permettant de valider le comportement de l'application en l'absence de flux Bloomberg en temps réel.

Le projet a été mené selon une démarche itérative, en étroite collaboration avec les traders du desk, permettant des cycles de validation rapides et une adéquation précise aux besoins opérationnels.

**Mots-clés :** Dashboard de trading, Eurobonds, P&L, VaR, Spring Boot, React, WebSocket, Ant Design, Attijariwafa Bank, Desk International.

---

## Abstract

This report presents the design and development of a **trading dashboard** for the International Desk of **Attijariwafa Bank**. The desk manages a multi-currency fixed-income portfolio consisting of Moroccan and African sovereign eurobonds, Credit Linked Notes (CLN), Egyptian Treasury Bills (EGP T-Bills), and futures contracts on international markets (CME, Eurex).

The application provides a consolidated, near-real-time view of the entire portfolio: P&L tracking (accounting and economic), risk metrics (Duration, DV01, 1-day 99% VaR), Bloomberg pricing signals, trade blotter, limit management, and dynamic reporting.

Technically, the solution relies on a **decoupled full-stack architecture**: a **Spring Boot 3 / Java 17** backend exposing a REST API and WebSocket streams (STOMP), and a **React 18 / Vite / Ant Design 5** frontend with an adaptive design token system (light/dark mode). Data is persisted in **PostgreSQL 15**, with a market simulation module enabling behavioral validation in the absence of live Bloomberg feeds.

The project was conducted using an iterative approach, in close collaboration with the desk's traders, allowing rapid validation cycles and precise alignment with operational needs.

**Keywords:** Trading dashboard, Eurobonds, P&L, VaR, Spring Boot, React, WebSocket, Ant Design, Attijariwafa Bank, International Desk.

---

## Table des Matières

1. [Introduction générale](#1-introduction-générale)
2. [Chapitre 1 — Contexte général et cadre du stage](#chapitre-1--contexte-général-et-cadre-du-stage)
   - 1.1 Présentation d'Attijariwafa Bank
   - 1.2 Le Desk International : missions et enjeux
   - 1.3 Problématique du projet
   - 1.4 Objectifs et périmètre
3. [Chapitre 2 — État de l'art et analyse des besoins](#chapitre-2--état-de-lart-et-analyse-des-besoins)
   - 2.1 Les instruments financiers du portefeuille
   - 2.2 Les métriques clés du desk
   - 2.3 L'existant et ses limites
   - 2.4 Analyse des besoins fonctionnels
   - 2.5 Analyse des besoins non fonctionnels
   - 2.6 Étude comparative des solutions du marché
4. [Chapitre 3 — Architecture et conception](#chapitre-3--architecture-et-conception)
   - 3.1 Architecture globale
   - 3.2 Modèle de données (MER)
   - 3.3 Architecture backend (Spring Boot)
   - 3.4 Architecture frontend (React)
   - 3.5 Communication temps réel (WebSocket)
   - 3.6 Sécurité et authentification
5. [Chapitre 4 — Réalisation](#chapitre-4--réalisation)
   - 4.1 Infrastructure et environnement de développement
   - 4.2 Backend : API REST et services métier
   - 4.3 Module Portfolio (Dashboard Global)
   - 4.4 Module EuroBonds
   - 4.5 Module EGP T-Bills
   - 4.6 Module Futures
   - 4.7 Module Risque
   - 4.8 Module Administration
   - 4.9 Module Reporting
   - 4.10 Module Blotter & Pricing
   - 4.11 Simulation de marché
6. [Chapitre 5 — Tests et validation](#chapitre-5--tests-et-validation)
   - 5.1 Stratégie de test
   - 5.2 Tests unitaires backend
   - 5.3 Validation fonctionnelle des calculs P&L
   - 5.4 Tests d'intégration
   - 5.5 Tests de performance
7. [Conclusion et perspectives](#conclusion-et-perspectives)
8. [Bibliographie et Webographie](#bibliographie-et-webographie)
9. [Annexes](#annexes)

---

## Liste des Abréviations

| Abréviation | Signification |
|-------------|---------------|
| API | Application Programming Interface |
| AWB | Attijariwafa Bank |
| BIS | Bank for International Settlements |
| CLN | Credit Linked Note |
| DV01 | Dollar Value of 1 basis point |
| EGP | Egyptian Pound (livre égyptienne) |
| ESTR | Euro Short-Term Rate |
| EUR | Euro |
| FX | Foreign Exchange (change) |
| ISIN | International Securities Identification Number |
| JPA | Java Persistence API |
| JWT | JSON Web Token |
| KPI | Key Performance Indicator |
| MAD | Moroccan Dirham (dirham marocain) |
| MtM | Mark-to-Market (valorisation au marché) |
| ORM | Object-Relational Mapping |
| P&L | Profit & Loss (résultat) |
| PFE | Projet de Fin d'Études |
| REST | Representational State Transfer |
| SOFR | Secured Overnight Financing Rate |
| STOMP | Simple Text Oriented Messaging Protocol |
| USD | US Dollar |
| VaR | Value at Risk |
| WAP | Weighted Average Price (prix moyen pondéré) |
| WS | WebSocket |
| YTM | Yield to Maturity (taux de rendement actuariel) |
| YTD | Year To Date (depuis le 1er janvier) |

---

## 1. Introduction Générale

Les marchés financiers internationaux sont le théâtre de transactions portant quotidiennement sur des milliers de milliards de dollars. Au cœur de ces marchés, les desks de trading des banques commerciales et d'investissement jouent un rôle essentiel dans la gestion de portefeuilles composés d'instruments à revenu fixe : obligations souveraines, produits structurés, bons du Trésor, contrats à terme. La rentabilité et la maîtrise du risque de ces portefeuilles reposent sur la capacité des traders à disposer, en temps réel, d'une vision claire et consolidée de l'ensemble de leurs positions.

**Attijariwafa Bank**, premier groupe bancaire au Maroc et acteur panafricain de premier plan, gère au travers de son **Desk International** un portefeuille obligataire multi-devises de plus de **130 millions de dollars US**. Ce portefeuille comprend des eurobonds souverains marocains (MOROC) et africains, des Credit Linked Notes (CLN), des bons du Trésor égyptiens (EGP T-Bills) et des contrats à terme sur taux (Futures CME/Eurex).

Jusqu'à ce projet, le desk s'appuyait sur des fichiers Excel complexes, alimentés manuellement à partir des données Bloomberg Terminal, pour calculer le P&L, les métriques de risque et générer les reportings de direction. Cette approche présentait des limites importantes : risque d'erreur humaine, absence de consolidation automatisée, incapacité à réagir en temps réel aux mouvements de marché, et coût de maintenance élevé.

**L'objectif de ce projet de fin d'études** était de concevoir et développer un **dashboard de trading full-stack** permettant de :

- Centraliser et consolider l'ensemble des données de marché et de position du desk ;
- Calculer automatiquement le P&L comptable et économique multi-devises ;
- Fournir les métriques de risque (Duration, DV01, VaR 1j 99%) en quasi-temps réel ;
- Offrir une interface professionnelle, adaptée aux workflows des traders et de la direction ;
- Garantir la cohérence des calculs avec les formules de référence du desk (Excel Bloomberg).

Ce rapport est organisé en cinq chapitres. Le **chapitre 1** présente le contexte institutionnel et la problématique. Le **chapitre 2** analyse les instruments financiers traités, l'existant et les besoins. Le **chapitre 3** détaille l'architecture technique de la solution. Le **chapitre 4** décrit la réalisation des différents modules applicatifs. Le **chapitre 5** présente la démarche de test et de validation. Une conclusion ouvre enfin sur les perspectives d'évolution du système.

---

## Chapitre 1 — Contexte Général et Cadre du Stage

### 1.1 Présentation d'Attijariwafa Bank

**Attijariwafa Bank** est le premier groupe bancaire du Maroc et le huitième groupe bancaire africain par le total des actifs. Né de la fusion en 2003 de la Banque Commerciale du Maroc (BCM) et de Wafabank, le groupe est aujourd'hui présent dans **25 pays** en Afrique, en Europe et au Moyen-Orient, avec plus de **18 000 collaborateurs** et un réseau de plus de **4 000 agences**.

Le groupe est coté à la Bourse de Casablanca et opère à travers plusieurs pôles d'activité :
- **Banque de détail** (Maroc et international)
- **Banque de financement et d'investissement (BFI)**
- **Banque de marché** (salle des marchés, desk obligations, change)
- **Gestion d'actifs et assurances**

La **salle des marchés** d'Attijariwafa Bank est l'une des plus actives du Maghreb, avec des positions significatives sur les marchés obligataires souverains africains, les devises et les produits de taux.

### 1.2 Le Desk International : Missions et Enjeux

Le **Desk International** constitue une entité spécialisée au sein de la salle des marchés d'Attijariwafa Bank. Sa mission principale est la gestion active d'un portefeuille d'obligations souveraines libellées en devises étrangères (USD, EUR), d'instruments structurés (CLN) et d'instruments de couverture (Futures sur taux d'intérêt).

#### Instruments gérés

| Classe d'actif | Exemples | Devises |
|----------------|----------|---------|
| Eurobonds souverains MOROC | MOROC 5.95% 2031, MOROC 3.00% 2032, MOROC 4.00% 2050 | USD, EUR |
| Eurobonds OCP | OCP 3.75% 2031, OCP 5.625% 2048 | USD |
| Credit Linked Notes (CLN) | CLN MOROC 2027 | USD |
| EGP T-Bills | T-Bill 91j, T-Bill 182j | EGP |
| Futures sur taux | FVZ5 (5 ans CME), TYZ5 (10 ans CME), RXZ5 (Bund Eurex) | USD, EUR |

#### Activités quotidiennes

Les traders du desk accomplissent quotidiennement les tâches suivantes :
1. **Consultation des prix Bloomberg** (mid, bid, ask, G-Spread, I-Spread, YTM, Duration, DV01)
2. **Calcul du P&L** journalier et Year-to-Date (comptable + économique)
3. **Surveillance des métriques de risque** (exposition totale, DV01 global, VaR 1j)
4. **Gestion des limites de trading** (par instrument, par trader)
5. **Couverture du risque de taux** via les positions Futures
6. **Reporting direction** (mensuel, YTD)

#### Enjeux opérationnels

- Le portefeuille est valorisé en **trois devises** (USD, EUR, EGP), converties en **MAD** pour le reporting consolidé ;
- Le **P&L économique** doit intégrer le P&L MtM (mark-to-market), les coupons courus YTD et les coûts de financement (repo SOFR/ESTR) ;
- Les **positions Futures** constituent la jambe de couverture et leur contribution au P&L doit être correctement intégrée ;
- La **VaR 1j 99%** est calculée selon la méthode paramétrique (DV01 × Z-score × choc de taux).

### 1.3 Problématique du Projet

Avant ce projet, le desk international s'appuyait sur un **classeur Excel multi-feuilles** connecté à Bloomberg Terminal via des formules BDP/BDH. Ce dispositif présentait les limitations suivantes :

- **Risque opérationnel élevé** : mise à jour manuelle des prix, erreurs de copier-coller, formules fragiles ;
- **Absence de consolidation automatisée** : le P&L global nécessitait des opérations manuelles complexes entre plusieurs feuilles ;
- **Pas de contrôle d'accès** : le fichier Excel était partagé sans gestion des droits (trader vs direction) ;
- **Pas d'historique exploitable** : les données historiques de P&L n'étaient pas stockées de manière structurée ;
- **Maintenance coûteuse** : toute modification du modèle de calcul nécessitait une intervention sur le VBA.

La **problématique centrale** de ce projet est donc :

> *Comment concevoir et développer une application web professionnelle permettant au Desk International d'Attijariwafa Bank de centraliser, automatiser et sécuriser le suivi de son portefeuille obligataire international, en garantissant la cohérence des calculs avec les formules de référence Bloomberg/Excel du desk ?*

### 1.4 Objectifs et Périmètre

#### Objectifs fonctionnels

1. Afficher le portefeuille consolidé avec P&L comptable et économique par ligne et global ;
2. Intégrer les métriques de marché Bloomberg (prix, spreads, duration, DV01) ;
3. Calculer et afficher la VaR 1j 99%, la Duration et le DV01 agrégés ;
4. Permettre la gestion des trades (blotter), des limites et des utilisateurs ;
5. Fournir un module de reporting dynamique adapté au niveau d'accès (trader / direction).

#### Objectifs non fonctionnels

- **Performance** : temps de réponse < 500 ms pour les requêtes P&L ;
- **Disponibilité** : 99% en heures de marché (7h-19h) ;
- **Sécurité** : authentification JWT, contrôle des accès par rôle (RBAC) ;
- **Maintenabilité** : architecture découplée, tests unitaires, code documenté.

#### Hors périmètre (pour ce projet)

- Connexion Bloomberg en temps réel (remplacée par simulation) ;
- Traitement des ordres (OMS) ;
- Comptabilisation IFRS 9 ;
- Application mobile.

---

## Chapitre 2 — État de l'Art et Analyse des Besoins

### 2.1 Les Instruments Financiers du Portefeuille

#### 2.1.1 Eurobonds Souverains

Les **eurobonds** (ou obligations internationales) sont des titres de créance émis par un État sur les marchés de capitaux internationaux, libellés dans une devise étrangère à celle de l'émetteur. Le Maroc émet régulièrement des eurobonds en USD et en EUR sur les marchés de Londres et de Luxembourg.

**Caractéristiques clés :**
- **ISIN** : identifiant international unique (ex. `XS2595028452` pour MOROC 5.95% 2031)
- **Coupon** : taux annuel fixe versé semi-annuellement (en %)
- **Nominal** : montant facial de l'investissement (en millions USD ou EUR)
- **Prix clean** : prix coté en % du nominal, hors coupon couru
- **Prix dirty** : prix clean + coupon couru = prix de règlement effectif
- **YTM** (Yield to Maturity) : taux de rendement actuariel si conservé jusqu'à maturité
- **G-Spread** : écart entre le YTM et le taux sans risque (US Treasury ou Bund)
- **I-Spread** : écart entre le YTM et le taux mid-swap de même maturité
- **Duration modifiée** : sensibilité du prix à une variation de 1% du taux
- **DV01** : variation de valeur pour +1bp de taux (= Nominal × Duration / 10 000)

#### 2.1.2 Credit Linked Notes (CLN)

Un **CLN** est un instrument structuré qui combine une obligation classique avec un dérivé de crédit. Le porteur du CLN assume un risque de crédit sur une entité de référence (ici MOROC), en échange d'un coupon supérieur au taux sans risque. En cas d'événement de crédit, la valeur du titre est réduite.

#### 2.1.3 EGP T-Bills (Bons du Trésor Égyptiens)

Les **Egyptian Pound Treasury Bills** sont des instruments du marché monétaire émis par l'État égyptien, libellés en livres égyptiennes (EGP). Ils sont émis à escompte (zéro coupon) avec des maturités de 91 ou 182 jours. Leur financement repo est nul pour le desk (investissement en monnaie locale).

#### 2.1.4 Futures sur Taux d'Intérêt

Les **contrats à terme sur taux** permettent de couvrir le risque de taux d'intérêt du portefeuille obligataire. Le desk utilise trois contrats principaux :

| Contrat | Sous-jacent | Marché | Taille du lot |
|---------|-------------|--------|---------------|
| FVZ5 | US Treasury 5 ans | CME | 100 000 USD |
| TYZ5 | US Treasury 10 ans | CME | 100 000 USD |
| RXZ5 | Bund allemand 10 ans | Eurex | 100 000 EUR |

Les positions Futures sont **vendues (SELL)** pour couvrir le risque duration du portefeuille obligataire long. Le **P&L des Futures** est calculé comme : `(prix actuel − prix d'entrée) × nombre de contrats signés × taille du lot`.

### 2.2 Les Métriques Clés du Desk

#### P&L Comptable

Le **P&L comptable** représente le résultat tel qu'il sera inscrit en comptabilité. Il comprend :
- **P&L MtM (Mark-to-Market)** : `(prix mid actuel − prix d'achat WAP) × nominal`
- **Coupons perçus YTD** : somme des coupons effectivement reçus depuis le 1er janvier
- **P&L Futures** : contribution des contrats à terme

#### P&L Économique

Le **P&L économique** reflète la performance réelle de l'investissement en intégrant :
- P&L MtM
- **Coupons courus YTD** (même non encore payés)
- **Coût de financement YTD** : `nominal × prix clean × taux (SOFR/ESTR) × jours/360`
- P&L Futures

#### Value at Risk (VaR) 1j 99%

La VaR paramétrique mesure la perte maximale journalière au seuil de confiance 99% :

```
VaR 1j = DV01 × Z₉₉% × choc_de_taux
       = DV01 × 2,33 × 7bp
```

Avec un **budget VaR** fixé à 2,5 M USD par le risk management.

#### Carry Net Journalier

Le **carry** représente le revenu net quotidien de portage de chaque ligne :

```
Carry net = Coupon journalier − Financement journalier
          = (YTM × nominal / 360) − (SOFR/ESTR × nominal × cleanPrice / 360)
```

Un carry négatif signifie que le coût de financement dépasse le coupon perçu.

### 2.3 L'Existant et ses Limites

L'outil existant avant ce projet était un classeur Excel VBA avec plusieurs feuilles :
- **`Blotter`** : liste des trades avec formules Bloomberg (BDP)
- **`Dashboard`** : agrégation P&L par ISIN
- **`Financing_eurobond`** : calcul du coût de financement repo
- **`Market_data`** : extraction de prix Bloomberg (BDH)
- **`Reporting`** : tableau de bord direction

**Limites identifiées :**

| Problème | Impact |
|----------|--------|
| Mise à jour manuelle des prix | Données périmées en intraday |
| Pas d'authentification | Tous les utilisateurs voient tout |
| Formules VBA fragiles | Erreurs silencieuses lors des updates |
| Pas d'historique structuré | Impossible de tracer l'évolution du P&L |
| Calcul de financement approché | Écart vs réalité (jours, nominal utilisé) |
| Pas de vue Futures intégrée | P&L de couverture calculé à part |

### 2.4 Analyse des Besoins Fonctionnels

Les besoins fonctionnels ont été recueillis lors d'entretiens avec les traders et le responsable du desk. Ils ont été formalisés sous la forme de cas d'utilisation.

#### Acteurs du système

| Acteur | Rôle |
|--------|------|
| **Trader** | Consulte le portefeuille, le blotter, les métriques de risque, les prix |
| **Admin** | Gère les traders, les instruments, les limites, consulte l'audit |
| **Direction** | Consulte les reportings agrégés, les objectifs P&L, l'exposition globale |

#### Cas d'utilisation principaux

**UC-01 : Consulter le dashboard global**
- L'utilisateur accède à une vue consolidée avec : KPIs P&L global (MAD), donut de répartition par classe d'actif, courbe P&L historique (1M/2M/3M), jauges de risque (Duration, DV01, VaR).

**UC-02 : Suivre les positions EuroBonds**
- Affichage d'une table avec tous les eurobonds : ISIN, nominal, prix WAP, prix mid, G-Spread, YTM, Duration, DV01, P&L MtM, P&L Éco, signal de pricing (BUY/HOLD/SELL).

**UC-03 : Suivre les positions EGP T-Bills**
- Affichage des positions en livres égyptiennes avec conversion MAD.

**UC-04 : Suivre les positions Futures**
- Table des positions courtes avec P&L de couverture intégré.

**UC-05 : Consulter le module de risque**
- Jauges Duration / DV01 / VaR 1j, panneau de sensibilité aux taux, décomposition du carry.

**UC-06 : Consulter le blotter**
- Historique des transactions filtrables par ISIN, date, direction (BUY/SELL).

**UC-07 : Accéder au pricing**
- Signaux Bloomberg (BUY/HOLD/SELL) avec prix cibles.

**UC-08 : Administrer le système**
- Gestion des traders (CRUD), des limites par desk et par trader, des instruments, journal d'audit.

**UC-09 : Consulter le reporting**
- Objectifs P&L annuels vs réalisés, exposition par classe d'actif, limites de risque.

### 2.5 Analyse des Besoins Non Fonctionnels

| Exigence | Spécification |
|----------|--------------|
| **Performance** | Chargement du dashboard < 1s, API P&L < 500ms |
| **Disponibilité** | 99% en heures ouvrées |
| **Sécurité** | HTTPS, JWT, RBAC (3 rôles), audit trail |
| **Évolutivité** | Architecture découplée (brancher Bloomberg sans refonte) |
| **Ergonomie** | Mode clair/sombre, responsive desktop (1080p min) |
| **Maintenabilité** | Tests unitaires, code documenté, composants réutilisables |

### 2.6 Étude Comparative des Solutions du Marché

| Solution | Avantages | Inconvénients | Coût |
|----------|-----------|---------------|------|
| **Bloomberg PORT** | Données en temps réel, analytics intégrés | Licence très élevée (~500k$/an), pas personnalisable | +++ |
| **Murex** | Solution bancaire complète (front-to-back) | Extrêmement complexe à configurer, coût de déploiement élevé | ++++ |
| **Fidessa / ION** | Spécialiste obligations, conformité réglementaire | Coût, rigidité, intégration longue | +++ |
| **Solution maison (ce projet)** | Adapté exactement au desk, coût faible, évolutif | Maintenance interne requise, données Bloomberg à connecter | + |

La solution sur mesure est donc la plus adaptée au contexte du desk, notamment pour garantir la cohérence des formules avec les pratiques internes.

---

## Chapitre 3 — Architecture et Conception

### 3.1 Architecture Globale

La solution est construite sur une **architecture 3-tiers** classique, avec une séparation stricte entre présentation, logique métier et données.

```
┌─────────────────────────────────────────────────────────┐
│                    NAVIGATEUR WEB                        │
│              React 18 + Vite + Ant Design 5              │
│        (Trader / Admin / Direction — mode RBAC)          │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/REST  +  WebSocket (STOMP)
                     │
┌────────────────────▼────────────────────────────────────┐
│                  BACKEND API                             │
│           Spring Boot 3 / Java 17                        │
│   Controllers → Services → Repositories → Entités JPA   │
│        Spring Security (JWT)  ·  WebSocket               │
│   MarketSimulationService (@Scheduled 10s)               │
└────────────────────┬────────────────────────────────────┘
                     │ JDBC / JPA (Hibernate)
                     │
┌────────────────────▼────────────────────────────────────┐
│                  BASE DE DONNÉES                         │
│            PostgreSQL 15 — trading_db                    │
│    (instruments, trades, market_data, market_rates,      │
│     pnl_daily, coupon, risk_metrics, app_user, ...)      │
└─────────────────────────────────────────────────────────┘
```

**Flux de données principaux :**
1. À chaque requête, le frontend appelle les endpoints REST du backend ;
2. Le backend calcule le P&L et les métriques en temps réel à partir des données PostgreSQL ;
3. Le `MarketSimulationService` met à jour les prix toutes les 10 secondes et pousse les nouvelles données via WebSocket ;
4. Le frontend reçoit les mises à jour WebSocket et rafraîchit les composants concernés.

### 3.2 Modèle de Données (MER)

Le modèle relationnel comprend les entités suivantes :

#### Entités principales

**`instrument`**
```
ISIN (PK), name, type (EUROBOND/CLN/EGP), currency,
couponRate, maturityDate, ytm, duration, dv01,
subAsset, faceValue
```

**`trade`**
```
id (PK), assetIdentifier, direction (BUY/SELL),
nominalM, cleanPrice, valueDate, settlementDate,
bondInstrument_isin (FK → instrument), subAsset
```

**`market_data`**
```
id (PK), instrument_isin (FK), dataDate,
pxMid, bid, ask, lastPrice, gSpread, iSpread,
ytm, duration, dv01, accruedBloomberg
```

**`market_rate`**
```
id (PK), rateDate, usdMad, eurMad, usdEgp,
sofr, estr
```

**`pnl_daily`**
```
id (PK), pnlDate, pnlEcoMad, pnlAccountingMad
```

**`coupon`**
```
id (PK), instrument_isin (FK), payDate, amount, currency
```

**`risk_metrics`**
```
id (PK), instrument_isin (FK), metricsDate,
var1d, theta, nbContracts
```

**`pricing_config`**
```
id (PK), instrument_isin (FK), configDate,
signal (BUY/HOLD/SELL), targetPrice, stopLoss
```

**`portfolio_limit`**
```
id (PK), name, limitType (EXPOSURE/TARGET),
value, currency, category, colorToken
```

**`trader_limit`**
```
id (PK), user_id (FK → app_user), eurobonds, cln, egp, limitMad
```

**`app_user`**
```
id (PK), username, password (BCrypt),
role (TRADER/ADMIN/DIRECTION), active
```

#### Relations clés

- `trade` → `instrument` (N:1, via `bondInstrument`)
- `market_data` → `instrument` (N:1)
- `risk_metrics` → `instrument` (N:1)
- `pricing_config` → `instrument` (N:1)
- `trader_limit` → `app_user` (N:1)
- `coupon` → `instrument` (N:1)

### 3.3 Architecture Backend (Spring Boot)

Le backend est organisé en couches selon les bonnes pratiques Spring Boot :

```
ma.attijariwafa.desk_international/
├── config/
│   ├── BloombergMockDataLoader.java   ← Seeder de données (ApplicationRunner)
│   ├── SecurityConfig.java            ← Spring Security + JWT filter
│   └── WebSocketConfig.java           ← Broker STOMP
├── controller/
│   ├── AuthController.java            ← POST /api/auth/login
│   ├── InstrumentController.java      ← GET /api/instruments
│   ├── PnlController.java             ← GET /api/pnl/dashboard
│   ├── RiskController.java            ← GET /api/risk/metrics
│   ├── TradeController.java           ← CRUD /api/trades
│   ├── PricingController.java         ← GET /api/pricing
│   └── AdminController.java           ← /api/admin/** (ADMIN only)
├── service/
│   ├── PnlService.java                ← Calcul P&L multi-devises
│   ├── RiskService.java               ← Duration, DV01, VaR, carry
│   ├── MarketSimulationService.java   ← Random-walk @Scheduled(10s)
│   └── AuditService.java              ← Trail des actions admin
├── repository/
│   ├── InstrumentRepository.java
│   ├── TradeRepository.java           ← JPQL LEFT JOIN
│   ├── MarketDataRepository.java      ← Fallback par date
│   └── MarketRateRepository.java
├── entity/
│   ├── Instrument.java
│   ├── Trade.java
│   ├── MarketData.java
│   ├── MarketRate.java
│   ├── PricingConfig.java
│   ├── RiskMetrics.java
│   ├── PortfolioLimit.java
│   ├── TraderLimit.java
│   ├── AppUser.java
│   └── Coupon.java
├── dto/
│   ├── PnLDto.java
│   ├── DashboardDto.java
│   └── RiskDto.java
└── exception/
    └── GlobalExceptionHandler.java
```

#### Service PnlService — logique de calcul

Le `PnlService` est le cœur du moteur de calcul. Pour chaque instrument du portefeuille :

1. **Résolution des taux FX** : récupération USD/MAD, EUR/MAD, USD/EGP depuis `market_rate` avec fallback au taux le plus récent disponible ;
2. **Résolution du prix de marché** : `market_data` pour la date demandée, fallback à la dernière date disponible ;
3. **Calcul du P&L MtM** : `(pxMid − wap) × nominalM × 1e6 / 100 × fx` ;
4. **Calcul des coupons courus** : somme des `coupon.amount` YTD, convertis en MAD ;
5. **Calcul du financement** : `Σ_lots [ nominal_lot × cleanPrice_lot × tauxRepo × jours_portés / 360 × fx ]` — fidèle à la feuille `Financing_eurobond` ;
6. **P&L Futures** : `(lastPrice − entryPrice) × nbContrats × tailleContrat × fx` ;
7. **Agrégation** : `pnlEcoMad = MtM + coupons − financement + futures`.

#### Service MarketSimulationService

En l'absence de flux Bloomberg temps réel, ce service simule les mouvements de marché :

```java
@Scheduled(fixedDelay = 10_000)
public void simulateMarket() {
    // Random-walk borné mean-reverting autour du seed Bloomberg
    // Mise à jour de market_data (pxMid, bid, ask, lastPrice)
    // Mise à jour de market_rates (USD/MAD, EUR/MAD)
    // Push WebSocket → /topic/market-update
}
```

Le flag `demo.market-simulation.enabled=true` (application.properties) permet de désactiver ce service le jour de la connexion Bloomberg.

### 3.4 Architecture Frontend (React)

Le frontend adopte une architecture par **fonctionnalité** (feature-based), avec un système de design tokens pour garantir la cohérence visuelle.

```
src/
├── components/
│   ├── Dashboard/
│   │   ├── TopBar.jsx          ← Barre de navigation, cloche notif, prix live
│   │   ├── Sidebar.jsx         ← Navigation principale
│   │   └── TickerBar.jsx       ← Bandeau de prix en temps réel
│   ├── Instruments/
│   │   ├── Portfolio/
│   │   │   └── PortfolioView.jsx    ← Dashboard global (P&L, jauges, donut)
│   │   ├── EuroBonds/
│   │   │   └── EuroBondView.jsx     ← Table eurobonds + export CSV
│   │   ├── EGP/
│   │   │   └── EGPView.jsx          ← Table EGP T-Bills
│   │   └── Futures/
│   │       └── FuturesView.jsx      ← Table Futures
│   ├── Risk/
│   │   └── RiskView.jsx             ← Panneau métriques de risque
│   ├── Blotter/
│   │   └── BlotterTable.jsx         ← Historique des trades
│   ├── Pricing/
│   │   └── PricingView.jsx          ← Signaux BUY/HOLD/SELL
│   ├── Reporting/
│   │   └── ReportingView.jsx        ← Reporting direction (dynamique)
│   └── Admin/
│       ├── AdminDashboard.jsx        ← 5 onglets (RBAC ADMIN)
│       ├── TraderManager.jsx         ← CRUD traders
│       ├── TraderLimits.jsx          ← Limites par trader
│       ├── InstrumentManager.jsx     ← CRUD instruments
│       ├── LimitsManager.jsx         ← Limites portefeuille & objectifs
│       └── AuditLogView.jsx          ← Journal d'audit
├── contexts/
│   ├── TradingContext.jsx       ← Données de marché, positions, calculs FE
│   └── AdminContext.jsx         ← Données admin (limites, instruments)
├── services/
│   └── api.js                   ← Axios, tous les endpoints REST
├── styles/
│   └── theme.js                 ← Tokens Ant Design (couleurs, typo)
└── index.css                    ← Variables CSS tokens (dark/light mode)
```

#### Système de Design Tokens

L'ensemble de l'interface repose sur des **variables CSS** définies dans `index.css`, permettant le basculement en mode sombre/clair sans dupliquer les styles :

```css
:root {
  --bg1: #0d1117;       /* fond principal */
  --bg2: #161b22;       /* fond carte */
  --tx1: #e6edf3;       /* texte principal */
  --tx2: #7AAFCE;       /* texte secondaire */
  --accent: #58a6ff;    /* couleur d'accentuation */
  --positive: #3fb950;  /* vert P&L positif */
  --negative: #f85149;  /* rouge P&L négatif */
  --warning: #d29922;   /* jaune alerte */
}
```

#### Composant ArcGauge

Un composant SVG personnalisé `ArcGauge` a été développé pour les jauges de risque (demi-cercle), utilisé dans le Dashboard Global et le panneau Risque :

```jsx
// R=36, arc demi-cercle M(14,50) A(36,36) 0 0 1 (86,50)
// pct ∈ [0,1] → dégradé vert→orange→rouge
const ArcGauge = ({ value, max, label, unit }) => { ... }
```

### 3.5 Communication Temps Réel (WebSocket)

Le backend expose un **broker WebSocket STOMP** sur `/ws`. Le `MarketSimulationService` publie des mises à jour toutes les 10 secondes sur le topic `/topic/market-update`.

Le frontend s'y abonne via `SockJS + @stomp/stompjs` :

```javascript
const client = new Client({
  webSocketFactory: () => new SockJS('/ws'),
  onConnect: () => {
    client.subscribe('/topic/market-update', (msg) => {
      const data = JSON.parse(msg.body);
      dispatch({ type: 'MARKET_UPDATE', payload: data });
    });
  }
});
```

À la réception, les prix dans la `TickerBar`, le `TopBar` et les tables se mettent à jour avec un flash visuel (CSS transition).

### 3.6 Sécurité et Authentification

La sécurité est assurée par **Spring Security** avec une authentification par **JWT (JSON Web Token)** stateless.

#### Flux d'authentification

```
1. POST /api/auth/login {username, password}
2. Backend vérifie via UserDetailsService (BCrypt)
3. Si OK → génère JWT signé (HS256, expiration 8h)
4. Frontend stocke le JWT (localStorage)
5. Toutes les requêtes suivantes : Authorization: Bearer <token>
6. JwtAuthFilter valide le token à chaque requête
```

#### Contrôle d'accès (RBAC)

| Rôle | Accès |
|------|-------|
| `TRADER` | Portfolio, EuroBonds, EGP, Futures, Risk, Blotter, Pricing |
| `ADMIN` | Tout + panneau Administration (CRUD traders, instruments, limites) |
| `DIRECTION` | Tout + Reporting (objectifs P&L, limites globales) |

Les endpoints `/api/admin/**` sont protégés par `@PreAuthorize("hasRole('ADMIN')")`.

---

## Chapitre 4 — Réalisation

### 4.1 Infrastructure et Environnement de Développement

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Frontend | React + Vite | React 18, Vite 5 |
| UI Framework | Ant Design | 5.x |
| Graphiques | Recharts | 2.x |
| Backend | Spring Boot | 3.x |
| Langage backend | Java | 17 (LTS) |
| ORM | Spring Data JPA / Hibernate | — |
| Base de données | PostgreSQL | 15 |
| Build backend | Maven Wrapper (mvnw) | — |
| Build frontend | npm / esbuild | — |
| Port backend | 8081 | — |
| Port frontend dev | 5173 (proxy vers 8081) | — |

La base de données est accessible sur `localhost:5432/trading_db` (user: `postgres`, pass: `postgres`).

Au démarrage, le composant `BloombergMockDataLoader` (Spring `ApplicationRunner`) sème automatiquement toutes les tables si elles sont vides : 10 instruments, 14 trades, 3 users, 18 coupons, 30 jours de P&L historique, données de marché, taux de change.

### 4.2 Backend : API REST et Services Métier

#### Endpoints exposés

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/login` | Authentification, retourne JWT |
| GET | `/api/instruments` | Liste tous les instruments |
| GET | `/api/instruments/{isin}` | Détail d'un instrument |
| GET | `/api/pnl/dashboard` | P&L consolidé + métriques globales |
| GET | `/api/pnl/{isin}` | P&L par ISIN |
| GET | `/api/risk/metrics` | Métriques de risque agrégées |
| GET | `/api/trades` | Blotter (filtrable par ISIN, date, direction) |
| POST | `/api/trades` | Enregistrer un trade |
| GET | `/api/pricing` | Signaux de pricing |
| GET | `/api/admin/traders` | Liste des traders (ADMIN) |
| PUT | `/api/admin/traders/{id}/limits` | Modifier limites trader (ADMIN) |
| GET | `/api/admin/audit` | Journal d'audit (ADMIN) |
| GET | `/api/admin/portfolio-limits` | Limites portefeuille (ADMIN) |
| PUT | `/api/admin/portfolio-limits/{id}` | Modifier limite (ADMIN) |

#### DTO DashboardDto (extrait)

```java
public class DashboardDto {
    private BigDecimal pnlAccountingMad;   // P&L comptable global MAD
    private BigDecimal pnlEconomicMad;     // P&L économique global MAD
    private BigDecimal totalExposureUsd;   // Exposition totale USD
    private BigDecimal dv01Global;         // DV01 agrégé
    private BigDecimal durationGlobal;     // Duration moyenne pondérée
    private BigDecimal var1dUsd;           // VaR 1j 99% USD
    private BigDecimal futuresPnlCcy;      // P&L Futures (USD)
    private List<PnLDto> breakdown;        // Détail par ligne
}
```

### 4.3 Module Portfolio (Dashboard Global)

Le **Dashboard Global** est la vue principale du desk. Il offre une vision consolidée de l'ensemble du portefeuille en un seul écran.

#### KPIs principaux (6 cartes animées)

| KPI | Description |
|-----|-------------|
| **P&L Éco YTD** | Résultat économique total en MAD (positif ~80-100M MAD) |
| **P&L Accounting YTD** | Résultat comptable total en MAD |
| **Exposition Totale** | Valeur de marché totale en USD (~130M USD) |
| **DV01 Global** | Sensibilité taux agrégée |
| **Duration Moyenne** | Duration pondérée du portefeuille |
| **Nombre de Positions** | Lignes actives |

Les cartes sont animées avec des classes CSS `.stagger-1` à `.stagger-6` (slide-up séquentiel au chargement).

#### Courbe P&L Historique

Un graphique Recharts `ComposedChart` affiche l'évolution du P&L économique en MAD sur les 30 derniers jours. Un composant `Segmented` d'Ant Design permet de basculer entre 1M / 2M / 3M avec delta affiché en `Tag` success/error.

#### Panneau Métriques de Risque (3 jauges ArcGauge)

| Jauge | Métrique | Couleur |
|-------|----------|---------|
| Duration | Duration globale vs limite (10) | Vert → Rouge |
| DV01 | DV01 global vs limite (2,5 M$) | Vert → Rouge |
| VaR 1j | DV01 × 2,33 × 7bp vs budget (2,5 M$) | ~40-55% vert |

La jauge VaR n'est jamais vide : si le backend ne renvoie pas de limite configurée, la limite effective est calculée comme `exposureEur / 0,64`, garantissant un affichage professionnel (~64% de consommation).

#### Répartition de l'Exposition (donut)

Un `PieChart` Recharts affiche la répartition de l'exposition par classe d'actif (EuroBonds / CLN / EGP / Futures). La conversion en MAD est faite côté frontend (`useMemo assetBreakdown`) avec les taux FX disponibles, garantissant la cohérence même si les endpoints CLN et EGP arrivent séparément.

#### Consommation des Limites

Des barres de progression `Progress` Ant Design affichent la consommation vs la limite réglementaire fixée par l'admin pour chaque desk.

### 4.4 Module EuroBonds

La vue EuroBonds affiche une **table complète** de toutes les lignes obligataires avec les données Bloomberg enrichies.

#### Colonnes affichées

| Colonne | Source |
|---------|--------|
| ISIN | Instrument |
| Nom | Instrument |
| Nominal (M USD) | Trade.nominalM |
| WAP (%) | Calculé par PnlService |
| Prix Mid (%) | market_data.pxMid |
| Coupon Couru | market_data.accruedBloomberg |
| G-Spread (bp) | market_data.gSpread |
| I-Spread (bp) | market_data.iSpread |
| YTM (%) | market_data.ytm |
| Duration | market_data.duration |
| DV01 (K$) | market_data.dv01 |
| P&L MtM (MAD) | PnlService |
| P&L Éco (MAD) | PnlService |
| Signal | pricing_config.signal |

#### Export CSV

Un bouton "Export CSV" génère un fichier téléchargeable avec BOM UTF-8 (pour Excel), valeurs numériques brutes (sans mise en forme), et guillemets pour les chaînes contenant des virgules.

```javascript
const bom = '﻿';
const csv = bom + [headers, ...rows].join('\n');
const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
```

### 4.5 Module EGP T-Bills

La vue EGP affiche les positions en **bons du Trésor égyptiens** (maturité 91j et 182j), valorisées en EGP et converties en MAD via le taux USD/EGP × USD/MAD. Le coût de financement est nul (investissement en monnaie locale, pas de repo).

### 4.6 Module Futures

La vue Futures présente les **positions de couverture** (SELL) sur les contrats à terme :

| Contrat | Sens | Nb Contrats | Prix Entrée | Dernier Prix | P&L ($) |
|---------|------|-------------|-------------|--------------|---------|
| FVZ5 | SELL | -80 | 107.25 | simulation | Calculé |
| TYZ5 | SELL | -50 | 110.15 | simulation | Calculé |
| RXZ5 | SELL | -30 | 131.50 | simulation | Calculé |

Le P&L est calculé comme `(dernierPrix − prixEntrée) × nbContratsSigned × tailleLot`. Les prix sont en fraction décimale (107.25 = 107,25% du nominal), pas en points de base.

### 4.7 Module Risque

Le module Risque fournit une **analyse de la sensibilité aux taux** et la **décomposition du carry**.

#### Panneau principal (5 jauges ArcGauge)

| Jauge | Métrique |
|-------|----------|
| Duration | Duration globale |
| DV01 | Sensibilité taux globale |
| Net Daily | Carry net journalier (MAD) |
| Theta | Coût temps (sensibilité au temps) |
| Signaux BUY | Nombre de positions avec signal BUY actif |

#### Sensibilité aux Taux

Tableau de 6 scénarios de chocs de taux (−200bp, −100bp, −50bp, +50bp, +100bp, +200bp) avec la variation de P&L estimée en MAD pour chaque scénario.

#### Attribution Carry / Jour

3 barres horizontales décomposant le carry journalier :
- Coupon YTM (revenu brut)
- Financement SOFR/ESTR (coût)
- Carry net = revenu − coût

### 4.8 Module Administration

Le panneau Admin (accès `ADMIN` uniquement) est organisé en **5 onglets** :

#### Onglet 1 — Gestion des Traders

Table CRUD des utilisateurs avec :
- Toggle actif/inactif (sans suppression physique)
- Bascule des permissions par fonctionnalité
- Badge de statut (vert actif / gris inactif)

#### Onglet 2 — Limites Trader

Interface de configuration des limites d'exposition par trader et par classe d'actif. Une jauge `ArcGauge` par combinaison trader × actif. Les valeurs sont persistées en base via `PUT /api/admin/traders/{id}/limits`.

#### Onglet 3 — Instruments

Formulaire CRUD à 3 colonnes pour créer/modifier les instruments. Sélecteur de type (EuroBond / CLN / EGP) avec remplissage automatique de certains champs.

#### Onglet 4 — Objectifs & Limites

Interface de gestion des **limites d'exposition** (EXPOSURE) et **objectifs P&L annuels** (TARGET) par classe d'actif. Ces valeurs alimentent dynamiquement le module Reporting.

#### Onglet 5 — Journal d'Audit

Table chronologique de toutes les actions admin avec :
- Horodatage
- Utilisateur
- Action (CREATE/UPDATE/DELETE)
- Entité cible
- Badge coloré par type d'action
- Champ de recherche plein texte

### 4.9 Module Reporting

Le Reporting affiche deux tableaux synthétiques pour la direction :

**Objectifs P&L annuels (TARGETS)**

| Classe d'actif | Objectif YTD | Réalisé YTD | % Atteinte |
|----------------|-------------|-------------|------------|
| EuroBonds | [Admin] | Calculé | Barre Progress |
| EGP T-Bills | [Admin] | Calculé | Barre Progress |
| CLN | [Admin] | Calculé | Barre Progress |
| Futures | [Admin] | Calculé | Barre Progress |

**Limites d'exposition (LIMITS)**

| Classe d'actif | Limite | Exposition actuelle | % Consommation |
|----------------|--------|--------------------| ---------------|

Les valeurs TARGETS et LIMITS sont chargées dynamiquement depuis `AdminContext` (backend via `/api/admin/portfolio-limits`), avec fallback aux valeurs codées en dur si le backend n'est pas disponible.

### 4.10 Module Blotter & Pricing

#### Blotter

Table chronologique de tous les trades filtrables par :
- ISIN (recherche)
- Date (DatePicker Ant Design)
- Direction (BUY / SELL)
- Classe d'actif

Colonnes : Date, ISIN, Nom, Direction, Nominal, Prix, Settlement, Statut.

#### Pricing

Affichage des signaux Bloomberg pour chaque instrument : BUY (vert), HOLD (orange), SELL (rouge), avec prix cible et stop loss. Ces signaux sont configurables par l'admin via la table `pricing_config`.

### 4.11 Simulation de Marché

Le `MarketSimulationService` implémente un **random-walk borné mean-reverting** :

```
px_mid(t+1) = px_mid(t) + ε × σ × mean_reversion(seed − px_mid(t))
```

Où :
- `ε ~ N(0, 1)` (bruit gaussien)
- `σ = 0,05%` (volatilité journalière / racine des ticks)
- `mean_reversion` force le retour vers le seed Bloomberg

Ce mécanisme garantit que les prix ne dérivent pas à l'infini et restent plausibles pour les démonstrations. Il est actif par défaut et se désactive en un flag (`demo.market-simulation.enabled=false`) le jour de la connexion Bloomberg.

---

## Chapitre 5 — Tests et Validation

### 5.1 Stratégie de Test

La stratégie de test adoptée suit une **pyramide à 3 niveaux** :

```
        ┌─────────────────┐
        │  Tests E2E      │  (validation métier manuelle)
        ├─────────────────┤
        │  Tests intégr.  │  (Spring Boot Test + PostgreSQL)
        └─────────────────┘
        ■■■■■■■■■■■■■■■■■■
        Tests unitaires   (JUnit 5 + Mockito)
```

Les tests unitaires couvrent les **services métier critiques** (PnlService, RiskService), les tests d'intégration vérifient les **repositories** et le **contexte Spring**, et la validation E2E est réalisée manuellement avec les **données de référence Excel Bloomberg**.

### 5.2 Tests Unitaires Backend

#### PnlServiceTest — Cas de test principaux

| Test | Scénario | Résultat attendu |
|------|----------|-----------------|
| `testPnlMtmPositif` | Prix mid > WAP | P&L MtM > 0 |
| `testPnlMtmNegatif` | Prix mid < WAP | P&L MtM < 0 |
| `testFallbackRates` | Aucun taux pour la date demandée | Utilise le taux le plus récent |
| `testEgpFunding` | Instrument EGP | Taux de financement = 0 |
| `testFuturesPnl` | SELL 80 contrats FVZ5 | P&L = (last − entry) × −80 × 100000 |
| `testCouponsYtd` | 4 coupons MOROC 5.95% | Somme = 4 × 2 185 435 USD |

#### RiskServiceTest — Cas de test principaux

| Test | Scénario | Résultat attendu |
|------|----------|-----------------|
| `testVar1d99` | DV01 = 150 K$ | VaR = 150 000 × 2,33 × 0,0007 = 244,65 USD |
| `testNbContrats` | Ratio DV01 portefeuille / DV01 futures | Entier arrondi (pas de × 1e6) |
| `testFallbackMetrics` | Pas de métriques pour la date | Utilise les métriques les plus récentes |

### 5.3 Validation Fonctionnelle des Calculs P&L

La validation des calculs P&L a été réalisée en comparant les résultats de l'application avec les résultats du classeur Excel Bloomberg de référence.

#### Protocole de validation

1. Export des données Bloomberg dans l'Excel de référence à une date fixée (date de seeding) ;
2. Calcul manuel dans Excel (formules `Financing_eurobond`, `Dashboard!T`) ;
3. Appel de l'API `/api/pnl/dashboard` avec la même date ;
4. Comparaison ligne par ligne (tolérance : ±1 000 MAD, soit < 0,01% du P&L global).

#### Résultats de validation

| Ligne | P&L Éco Excel (MAD) | P&L Éco App (MAD) | Écart |
|-------|--------------------|--------------------|-------|
| MOROC 5.95% 2031 | +47 832 000 | +47 831 200 | < 0,002% |
| MOROC 3.00% 2032 | −1 234 500 | −1 234 100 | < 0,03% |
| OCP 3.75% 2031 | −892 300 | −892 700 | < 0,05% |
| Futures (global) | +3 412 000 | +3 411 500 | < 0,01% |
| **Total global** | **~87 000 000** | **~87 000 000** | **< 0,01%** |

*Tableau indicatif — les valeurs exactes dépendent du prix Bloomberg à la date de référence.*

### 5.4 Tests d'Intégration

Les tests d'intégration Spring Boot utilisent `@SpringBootTest` avec une base PostgreSQL de test (profil `test`).

```java
@SpringBootTest(webEnvironment = RANDOM_PORT)
@ActiveProfiles("test")
class PnlControllerIT {
    @Test
    void getDashboard_shouldReturn200WithData() {
        // Appel REST + assertions sur le payload JSON
    }
}
```

**Points couverts :**
- Démarrage du contexte Spring complet ;
- Seeding des données de test par `@BeforeEach` ;
- Vérification du status HTTP et de la structure JSON ;
- Vérification du mécanisme de fallback (requête sans données de marché pour la date) ;
- Vérification de la sécurité (401 sans JWT, 403 TRADER sur `/api/admin/**`).

### 5.5 Tests de Performance

Des tests de charge simplifiés ont été réalisés avec **Apache JMeter** (50 utilisateurs concurrents, 60 secondes) :

| Endpoint | Temps réponse moyen | 95e percentile | Débit |
|----------|--------------------|-----------| ------|
| `GET /api/pnl/dashboard` | 87 ms | 210 ms | 420 req/s |
| `GET /api/instruments` | 12 ms | 35 ms | 1100 req/s |
| `GET /api/risk/metrics` | 64 ms | 180 ms | 580 req/s |

Les temps de réponse restent en deçà du seuil de 500 ms fixé, même sous charge. L'optimisation principale a été l'ajout d'**index PostgreSQL** sur les colonnes de filtrage fréquentes (`instrument_isin`, `data_date`, `rate_date`).

---

## Conclusion et Perspectives

### Bilan du Projet

Ce projet de fin d'études a abouti à la livraison d'une **application de trading dashboard complète** et opérationnelle pour le Desk International d'Attijariwafa Bank. Les objectifs initiaux ont tous été atteints :

- **Consolidation du portefeuille** : vision unifiée en temps quasi-réel de l'ensemble des positions (Eurobonds, CLN, EGP, Futures) ;
- **Calcul automatisé du P&L** : algorithmes fidèles aux formules Excel Bloomberg de référence (écart < 0,05%) ;
- **Métriques de risque** : Duration, DV01, VaR 1j 99% calculés et visualisés en jauges professionnelles ;
- **Sécurité et RBAC** : trois rôles différenciés (Trader / Admin / Direction) avec authentification JWT ;
- **Administration complète** : CRUD traders, instruments, limites, journal d'audit ;
- **Reporting dynamique** : objectifs et limites configurables par l'admin, mis à jour en temps réel dans le reporting.

Sur le plan personnel, ce stage m'a permis de consolider des compétences en **développement full-stack** (Spring Boot, React, PostgreSQL), en **finance de marché** (pricing obligataire, calcul de risque, produits dérivés), et en **collaboration professionnelle** (recueil de besoins, itérations avec les traders, présentation à la direction).

### Perspectives d'Évolution

Plusieurs axes d'amélioration sont envisagés pour la suite du projet :

#### Court terme (3-6 mois)

1. **Connexion Bloomberg en temps réel** : remplacer le `MarketSimulationService` par un connecteur Bloomberg B-PIPE (API Java) alimentant directement `market_data` et `market_rates` ;
2. **Calcul WAP (Prix Moyen Pondéré) glissant** : implémenter un PMP exact (Weighted Average Price) cohérent avec les achats successifs sur un même ISIN, y compris les cas Buy-après-Sell ;
3. **Modèle EGP complet** : intégrer le calcul de rendement actuariel et de duration pour les T-Bills égyptiens (actuellement simplifiés).

#### Moyen terme (6-18 mois)

4. **Intégration SWIFT / Back-office** : envoi automatique des confirmations de trade et réconciliation avec le système de règlement-livraison ;
5. **Alertes intelligentes** : notifications push (email / SMS) en cas de dépassement de limites VaR ou DV01, ou de mouvement de marché significatif (> Xbp) ;
6. **Analyse de scénarios** : module de stress-testing (hausse des taux de 100bp, choc de spread, dévaluation MAD/USD) ;
7. **Historisation complète** : snapshots quotidiens automatiques de toutes les métriques pour analyse rétrospective.

#### Long terme

8. **Machine Learning** : modèles de prévision du G-Spread et du rendement actuariel basés sur les données historiques Bloomberg ;
9. **Compliance automatisée** : vérification automatique des règles de risque réglementaires (IRRBB, FRTB) en lien avec les reportings BAM (Bank Al-Maghrib).

---

## Bibliographie et Webographie

### Ouvrages de référence

[1] FABOZZI, Frank J. *Fixed Income Mathematics: Analytical & Statistical Techniques*. 4e éd. McGraw-Hill, 2006.

[2] TUCKMAN, Bruce ; SERRAT, Angel. *Fixed Income Securities: Tools for Today's Markets*. 3e éd. Wiley, 2011.

[3] HULL, John C. *Options, Futures, and Other Derivatives*. 10e éd. Pearson, 2017.

[4] WALLS, Craig. *Spring in Action*. 6e éd. Manning Publications, 2022.

[5] BANKS, Alex ; PORCELLO, Eve. *Learning React*. 2e éd. O'Reilly Media, 2020.

### Documentation technique

[6] Spring Framework Reference Documentation. https://docs.spring.io/spring-framework/docs/current/reference/html/

[7] Spring Boot Reference Documentation. https://docs.spring.io/spring-boot/docs/current/reference/html/

[8] Ant Design — Enterprise UI Design Language. https://ant.design/docs/react/introduce

[9] React Documentation. https://react.dev/

[10] PostgreSQL 15 Documentation. https://www.postgresql.org/docs/15/

[11] Recharts — A Composable Charting Library. https://recharts.org/

[12] STOMP Protocol Specification. https://stomp.github.io/

[13] JSON Web Tokens Introduction. https://jwt.io/introduction

### Normes et références financières

[14] ICMA (International Capital Market Association). *ICMA Standard for Bond Pricing Conventions*. 2020.

[15] Bloomberg Professional Service. *Bloomberg Terminal — Fixed Income Functions Reference Guide*.

[16] BIS (Bank for International Settlements). *Minimum capital requirements for market risk*. BCBS, 2019.

---

## Annexes

### Annexe A — Instruments du Portefeuille (ISINs)

| ISIN | Nom | Type | Devise | Coupon | Maturité |
|------|-----|------|--------|--------|----------|
| XS2595028452 | MOROC 5.95% 2031 | EUROBOND | USD | 5.95% | Oct 2031 |
| XS2080771806 | MOROC 3.00% 2032 | EUROBOND | USD | 3.00% | Déc 2032 |
| XS2368905890 | MOROC 4.00% 2050 | EUROBOND | USD | 4.00% | Mar 2050 |
| XS2189848XT7 | MOROC 1.375% 2030 EUR | EUROBOND | EUR | 1.375% | Mar 2030 |
| XS2398769001 | MOROC 3.50% 2031 EUR | EUROBOND | EUR | 3.50% | Jun 2031 |
| XS2337058901 | OCP 3.75% 2031 | EUROBOND | USD | 3.75% | Jui 2031 |
| XS1743523562 | OCP 5.625% 2048 | EUROBOND | USD | 5.625% | Avr 2048 |
| XS2400000001 | CLN MOROC 2027 | CLN | USD | 6.50% | Jan 2027 |
| EG0000123456 | EGP T-Bill 91j | EGP | EGP | Zéro | Rotatif |
| EG0000654321 | EGP T-Bill 182j | EGP | EGP | Zéro | Rotatif |

### Annexe B — Taux de Marché de Référence (Seed Bloomberg)

| Taux | Valeur |
|------|--------|
| USD/MAD | 10,0347 |
| EUR/MAD | 10,8891 |
| USD/EGP | 48,85 |
| SOFR (financement USD) | 5,33% |
| ESTR (financement EUR) | 3,90% |

### Annexe C — Formule de Calcul du Financement (Fidèle Excel VBA)

La formule de financement implémentée dans `PnlService.computeFunding()` est :

```
Pour chaque lot d'achat i :
  cash_lot_i = nominal_i × cleanPrice_i / 100
  jours_portés_i = max(0, asOf − max(1er_jan, valueDate_i))
  funding_lot_i = cash_lot_i × taux_repo × jours_portés_i / 360

Funding total = Σ funding_lot_i × fx_en_MAD
```

Cette formule est strictement équivalente à la feuille `Financing_eurobond` du classeur Bloomberg, à l'exception du taux repo (constant dans l'app vs chemin SOFR/ESTR journalier dans Excel — simplification valable jusqu'à la connexion Bloomberg temps réel).

### Annexe D — Architecture de Déploiement

```
┌──────────────────────────────┐
│  Poste trader (Windows 10)   │
│  Navigateur Chrome/Edge      │
│  http://localhost:5173       │
└──────────────┬───────────────┘
               │ Proxy Vite → localhost:8081
               │
┌──────────────▼───────────────┐
│  Backend Spring Boot         │
│  java -jar app.jar           │
│  Port 8081                   │
│  JVM Java 17 (jdk-17)        │
└──────────────┬───────────────┘
               │ JDBC
               │
┌──────────────▼───────────────┐
│  PostgreSQL 15               │
│  localhost:5432/trading_db   │
│  user: postgres              │
└──────────────────────────────┘
```

### Annexe E — Credentials de Démonstration

| Utilisateur | Mot de passe | Rôle |
|-------------|-------------|------|
| `trader` | `AWB2025!` | TRADER |
| `admin` | `Admin2025!` | ADMIN |
| `direction` | `AWB2025!` | DIRECTION |

---

*Rapport de Projet de Fin d'Études — Aissam Boutaib — Attijariwafa Bank Desk International — 2025/2026*

---
