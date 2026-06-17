# Pack de démarrage

**Projet :** Extension métier de capture de scénarios Playwright  
**Document :** 00_README  
**Version :** v0.1 - Dossier de lancement  
**Date :** 17 juin 2026  
**Statut :** Draft de démarrage  

---


## Objectif du pack

Ce pack sert à lancer la conception et le développement d'une extension Chrome interne permettant aux utilisateurs métier d'enregistrer un scénario de test fonctionnel, d'ajouter des informations métier et de transmettre aux développeurs un artefact exploitable pour créer un test Playwright maintenable.

## Livrables inclus

| Fichier | Rôle |
|---|---|
| `01_Cahier_des_charges.md` | Vision produit, périmètre, acteurs, exigences et critères d'acceptation. |
| `02_Specifications_fonctionnelles.md` | Parcours utilisateurs, fonctionnalités attendues et règles de gestion. |
| `03_Specifications_techniques.md` | Architecture technique, modules, permissions Chrome, intégration Playwright CRX. |
| `04_Modele_donnees_et_exports.md` | Format `scenario.json`, structure ZIP et exemples TypeScript. |
| `05_Backlog_MVP.md` | Epics, user stories, priorisation MVP, DoD et critères de recette. |
| `06_Securite_Risques_Maintenance.md` | Risques sécurité, RGPD, permissions, maintenance upstream, mitigations. |
| `07_Runbook_demarrage_dev.md` | Préparation repo, commandes de démarrage, build, chargement unpacked, checks. |
| `08_Templates_tickets.md` | Templates GitHub/Jira pour créer les tickets de développement. |
| `09_ADR_initiales.md` | Décisions d'architecture proposées pour cadrer le projet. |

## Principe clé

Le métier ne produit pas un test final. Il produit une capture enrichie du scénario. Les développeurs récupèrent ensuite le scénario, nettoient les locators, ajoutent les fixtures, les données de test, les assertions robustes et intègrent le test au repo Playwright.

## Décision de cadrage recommandée

Retenir une extension maison de niveau 3 : interface métier propriétaire, moteur de capture basé sur Playwright CRX, export structuré, et outillage développeur de transformation.
