# Cahier des charges

**Projet :** Extension métier de capture de scénarios Playwright  
**Document :** 01_CDC  
**Version :** v0.1 - Dossier de lancement  
**Date :** 17 juin 2026  
**Statut :** Draft de démarrage  

---


## 1. Contexte

Aujourd'hui, les équipes métier rédigent des scénarios de test au format texte et les transmettent aux développeurs ou QA. Cette transmission manque parfois de précision : ordre réel des actions, état de l'écran, données saisies, assertions attendues, environnement utilisé et éléments applicatifs ciblés.

Le besoin est de fournir aux métiers un outil simple, accessible dans le navigateur, qui enregistre un parcours utilisateur et génère un artefact exploitable par les développeurs pour créer un test Playwright maintenable.

## 2. Objectifs

1. Permettre aux métiers d'enregistrer un scénario depuis Chrome ou Edge sans utiliser VS Code ni terminal.
2. Capturer les actions principales : navigation, clics, saisies, sélections, assertions.
3. Demander explicitement les informations métier nécessaires : nom du scénario, préconditions, données, résultat attendu.
4. Produire un export structuré comprenant `scenario.json`, un brouillon Playwright, des captures et éventuellement une trace Playwright.
5. Aider les développeurs à transformer rapidement cet export en test Playwright propre.
6. Réduire la dette de maintenance via score de qualité des locators, suggestions `data-testid` et garde-fous sécurité.

## 3. Hors objectifs

- Générer automatiquement un test final directement mergé en CI.
- Remplacer la revue développeur ou QA.
- Enregistrer des scénarios sur la production sans validation sécurité.
- Stocker des identifiants, mots de passe ou tokens réels.
- Supporter tous les cas complexes dès le MVP : multi-onglets avancé, iframe cross-origin complexe, upload/download, tests API ou assertions visuelles pixel-perfect.

## 4. Acteurs

| Acteur | Besoin principal |
|---|---|
| Métier | Enregistrer un parcours réel et exprimer le résultat attendu sans écrire de code. |
| Développeur / QA automation | Récupérer un artefact clair pour créer un test Playwright maintenable. |
| Référent QA | Valider la qualité des scénarios, prioriser les tests et suivre les demandes. |
| Référent sécurité | Auditer les permissions, données exportées et domaines autorisés. |
| Mainteneur de l'extension | Gérer le fork Playwright CRX, les versions Chrome/Edge et les releases internes. |

## 5. Périmètre MVP

Le MVP doit permettre :

- Démarrage/arrêt d'enregistrement depuis l'extension.
- Attachement de l'onglet courant au moteur Playwright CRX.
- Affichage d'un panneau latéral métier.
- Formulaire de métadonnées du scénario.
- Enregistrement d'actions utilisateur principales.
- Ajout manuel ou guidé d'assertions.
- Export ZIP contenant au minimum `scenario.json`, `draft.spec.ts`, `metadata.json` et captures d'écran.
- Score de qualité des locators.
- Détection et masquage basique des données sensibles.
- Blocage ou avertissement sur les domaines non autorisés.
- Documentation développeur pour importer un scénario.

## 6. Exigences fonctionnelles

| ID | Exigence | Priorité |
|---|---|---|
| F-001 | L'utilisateur peut démarrer un enregistrement depuis le bouton d'extension. | MVP |
| F-002 | L'utilisateur peut renseigner nom, fonctionnalité, préconditions et résultat attendu. | MVP |
| F-003 | L'extension capture les actions principales et les affiche en langage naturel. | MVP |
| F-004 | L'utilisateur peut ajouter une assertion guidée : visibilité, texte, valeur, URL. | MVP |
| F-005 | L'utilisateur peut ajouter un commentaire par étape. | MVP |
| F-006 | L'extension génère un brouillon Playwright lisible. | MVP |
| F-007 | L'extension exporte un ZIP structuré. | MVP |
| F-008 | L'extension évalue la robustesse des locators. | MVP |
| F-009 | L'extension propose des `data-testid` lorsque le locator est fragile. | MVP+ |
| F-010 | L'extension peut créer automatiquement un ticket GitHub/Jira. | V2 |
| F-011 | L'extension produit une trace Playwright consultable dans Trace Viewer. | MVP+ |
| F-012 | L'extension empêche ou signale l'enregistrement sur des domaines non autorisés. | MVP |

## 7. Exigences non fonctionnelles

| ID | Exigence | Cible |
|---|---|---|
| NF-001 | Simplicité | Un métier doit pouvoir enregistrer un scénario sans connaissance Playwright. |
| NF-002 | Sécurité | Aucune donnée sensible en clair dans les exports. |
| NF-003 | Maintenabilité | Le moteur Playwright CRX doit être isolé derrière une couche `RecorderEngine`. |
| NF-004 | Portabilité | Support Chrome et Edge Chromium. |
| NF-005 | Traçabilité | Chaque export contient date, version extension, environnement, URL de départ. |
| NF-006 | Conformité MV3 | Aucune exécution de code distant dans l'extension packagée. |
| NF-007 | Rejouabilité | Le brouillon généré doit servir de base, mais ne constitue pas un contrat de réussite automatique. |

## 8. Critères d'acceptation du MVP

Le MVP est acceptable si :

1. Un utilisateur métier peut enregistrer un scénario complet sur l'environnement de recette.
2. Le scénario exporté contient au moins une assertion métier.
3. Le ZIP contient les fichiers attendus et peut être transmis à un développeur.
4. Le développeur peut générer un fichier `.draft.spec.ts` en moins de deux commandes.
5. Les locators fragiles sont identifiés dans le rapport.
6. Les champs mot de passe et valeurs sensibles courantes sont masqués.
7. L'extension n'est utilisable que sur les domaines autorisés ou affiche un blocage explicite.
8. Le code source contient une documentation d'installation, de build et de release.

## 9. Indicateurs de succès

- Diminution du temps de compréhension des scénarios métier.
- Diminution des allers-retours métier/dev pour clarifier les étapes.
- Pourcentage de scénarios exportés avec assertions.
- Nombre de suggestions `data-testid` traitées.
- Taux de scénarios transformés en tests Playwright intégrés.

## 10. Livrables attendus

- Extension Chrome/Edge interne.
- Format `scenario.json` versionné.
- Export ZIP standardisé.
- Commande d'import côté repo Playwright.
- Documentation utilisateur métier.
- Documentation développeur.
- Stratégie de maintenance du fork Playwright CRX.
- Checklist sécurité et validation DSI.
