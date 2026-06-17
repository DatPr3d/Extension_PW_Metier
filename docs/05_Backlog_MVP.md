# Backlog MVP

**Projet :** Extension métier de capture de scénarios Playwright  
**Document :** 05_BACKLOG  
**Version :** v0.1 - Dossier de lancement  
**Date :** 17 juin 2026  
**Statut :** Draft de démarrage  

---


## 1. Priorisation

Notation :

- P0 : indispensable MVP.
- P1 : important MVP si temps disponible.
- P2 : version suivante.

## 2. Epics et user stories

### Epic A - Socle extension MV3

| ID | Story | Priorité | Critères d'acceptation |
|---|---|---|---|
| A-001 | En tant qu'utilisateur, je peux installer l'extension en mode unpacked. | P0 | Build produit un dossier chargeable dans Chrome. |
| A-002 | En tant qu'utilisateur, je peux ouvrir un panneau latéral. | P0 | Le panneau s'ouvre depuis le bouton d'extension. |
| A-003 | En tant qu'admin, je peux configurer les domaines autorisés. | P0 | Une URL hors domaine est bloquée ou avertie. |

### Epic B - Intégration Playwright CRX

| ID | Story | Priorité | Critères d'acceptation |
|---|---|---|---|
| B-001 | En tant que dev, je dispose d'un adaptateur `RecorderEngine`. | P0 | L'extension ne dépend pas directement de Playwright CRX hors adaptateur. |
| B-002 | En tant qu'utilisateur, je peux attacher l'onglet courant. | P0 | L'attachement fonctionne sur une page de recette autorisée. |
| B-003 | En tant qu'utilisateur, je peux démarrer et arrêter un enregistrement. | P0 | Le code généré ou flux interne est récupérable. |
| B-004 | En tant que dev, je peux générer une trace Playwright. | P1 | `trace.zip` est présent dans l'export si activé. |

### Epic C - Expérience métier

| ID | Story | Priorité | Critères d'acceptation |
|---|---|---|---|
| C-001 | Je renseigne les informations du scénario. | P0 | Titre, fonctionnalité, préconditions, résultat attendu. |
| C-002 | Je vois les étapes enregistrées en langage naturel. | P0 | Chaque action a un libellé compréhensible. |
| C-003 | J'ajoute une assertion guidée. | P0 | La soumission est impossible sans assertion. |
| C-004 | J'ajoute un commentaire sur une étape. | P0 | Le commentaire est exporté dans `scenario.json`. |

### Epic D - Export et import dev

| ID | Story | Priorité | Critères d'acceptation |
|---|---|---|---|
| D-001 | L'extension génère `scenario.json`. | P0 | Le fichier respecte le schéma 1.0.0. |
| D-002 | L'extension génère `draft.spec.ts`. | P0 | Le fichier compile après adaptation minimale. |
| D-003 | L'extension génère un ZIP complet. | P0 | ZIP contient scenario, draft, metadata, reports. |
| D-004 | Le dev importe un ZIP via CLI. | P1 | Une commande génère un fichier draft dans le repo cible. |

### Epic E - Qualité et sécurité

| ID | Story | Priorité | Critères d'acceptation |
|---|---|---|---|
| E-001 | L'extension score les locators. | P0 | CSS/XPath sont marqués fragiles. |
| E-002 | L'extension suggère des `data-testid`. | P1 | Rapport contient une suggestion pour locators fragiles. |
| E-003 | L'extension masque les secrets évidents. | P0 | Password/email/tokens ne sortent pas en clair selon règles. |
| E-004 | Les permissions sont documentées. | P0 | Un fichier sécurité explique chaque permission. |

## 3. Definition of Done

Une story est terminée si :

- Code typé et linté.
- Tests unitaires sur logique pure si applicable.
- Documentation mise à jour.
- Cas nominal testé manuellement dans Chrome.
- Aucun secret dans logs ou exports.
- Critères d'acceptation vérifiés.

## 4. Jeux de recette MVP

1. Scénario simple : recherche par ville.
2. Scénario avec formulaire et message d'erreur.
3. Scénario avec assertion de texte.
4. Scénario avec locator fragile et suggestion `data-testid`.
5. Scénario sur domaine interdit.
6. Scénario avec champ mot de passe masqué.

## 5. Jalons proposés

| Jalon | Résultat attendu |
|---|---|
| M0 - Cadrage | Documents validés, risques acceptés, stratégie fork choisie. |
| M1 - Spike technique | Attachement Playwright CRX, start/stop, export minimal. |
| M2 - MVP métier | UI, formulaire, assertions, export ZIP. |
| M3 - Sécurité et qualité | Masquage, whitelist, locator report, documentation. |
| M4 - Pilote | Test avec 2 à 3 utilisateurs métier sur recette. |
