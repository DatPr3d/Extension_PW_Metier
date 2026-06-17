# Templates de tickets

**Projet :** Extension métier de capture de scénarios Playwright  
**Document :** 08_TEMPLATES  
**Version :** v0.1 - Dossier de lancement  
**Date :** 17 juin 2026  
**Statut :** Draft de démarrage  

---


## 1. Epic - Extension métier Playwright Recorder

```md
## Contexte

Les métiers transmettent aujourd'hui des scénarios de test sous forme texte. L'objectif est de créer une extension Chrome interne qui capture les parcours métier et génère un export structuré exploitable par les développeurs pour créer des tests Playwright maintenables.

## Objectifs

- Enregistrer un scénario depuis Chrome/Edge.
- Capturer étapes, assertions, commentaires et captures.
- Exporter `scenario.json` et un brouillon Playwright.
- Garantir sécurité, masquage et domaines autorisés.

## Critères d'acceptation globaux

- Extension chargeable en local.
- Enregistrement complet sur environnement de recette.
- Export ZIP standardisé.
- Au moins une assertion obligatoire.
- Rapport de qualité des locators.
- Documentation utilisateur et développeur.
```

## 2. Story - Démarrer un enregistrement

```md
## User story

En tant qu'utilisateur métier, je veux démarrer un enregistrement depuis le navigateur afin de capturer le scénario de test que je veux transmettre aux développeurs.

## Critères d'acceptation

- Le bouton d'extension ouvre le panneau latéral.
- Le domaine courant est contrôlé.
- Le bouton `Démarrer` est disponible sur domaine autorisé.
- L'onglet courant est attaché au moteur Playwright CRX.
- Une erreur lisible est affichée en cas d'échec.

## Notes techniques

- Passer par `RecorderEngine`.
- Ne pas appeler Playwright CRX directement depuis l'UI.
- Libérer `chrome.debugger` à l'arrêt.
```

## 3. Story - Exporter le scénario

```md
## User story

En tant qu'utilisateur métier, je veux exporter mon scénario afin que les développeurs puissent créer le test Playwright correspondant.

## Critères d'acceptation

- Un ZIP est généré.
- Le ZIP contient `scenario.json`, `draft.spec.ts`, `metadata.json` et les rapports.
- Le scénario contient au moins une assertion.
- Les données sensibles sont masquées.
- Le fichier `scenario.json` respecte le schéma attendu.
```

## 4. Bug report - Recording

```md
## Problème observé

Décrire le comportement.

## Environnement

- Navigateur :
- Version extension :
- URL :
- Domaine autorisé : oui/non

## Etapes pour reproduire

1.
2.
3.

## Résultat attendu


## Résultat obtenu


## Artefacts

- scenario.json
- metadata.json
- screenshots
- logs sans données sensibles
```
