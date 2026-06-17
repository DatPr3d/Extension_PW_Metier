# ADR initiales

**Projet :** Extension métier de capture de scénarios Playwright  
**Document :** 09_ADR  
**Version :** v0.1 - Dossier de lancement  
**Date :** 17 juin 2026  
**Statut :** Draft de démarrage  

---


# ADR-001 - Utiliser une extension maison avec moteur Playwright CRX

## Statut

Proposé.

## Contexte

Les métiers ont besoin d'un outil simple dans le navigateur. Playwright Codegen est fiable mais orienté développeur. Playwright CRX fournit le recorder Playwright dans une extension Chrome et expose une API utilisable comme librairie.

## Décision

Créer une extension maison orientée métier, avec un moteur de capture basé sur un fork ou mirror interne de Playwright CRX. L'accès au moteur sera encapsulé derrière une interface `RecorderEngine`.

## Conséquences

- UX adaptée aux métiers.
- Réduction de l'adhérence directe à l'API Playwright CRX.
- Besoin d'audit sécurité lié à `chrome.debugger`.
- Besoin d'une stratégie de maintenance interne.

# ADR-002 - `scenario.json` comme source de vérité

## Statut

Proposé.

## Contexte

Le code Playwright généré par un recorder est utile mais rarement prêt pour un merge direct. Les développeurs ont besoin de l'intention métier, pas uniquement d'une suite d'instructions techniques.

## Décision

Le fichier `scenario.json` devient l'artefact principal. `draft.spec.ts` est généré à partir de ce fichier et peut être régénéré.

## Conséquences

- Meilleure pérennité du format.
- Possibilité de changer le moteur de génération.
- Obligation de maintenir un schéma JSON versionné.

# ADR-003 - Pas de PR automatique depuis les métiers

## Statut

Proposé.

## Contexte

Les tests E2E nécessitent fixtures, données, assertions robustes, conventions projet et revue technique.

## Décision

Les métiers exportent ou créent une demande de test. Les développeurs ou QA automation créent la PR finale.

## Conséquences

- Qualité maîtrisée.
- Moins de tests flaky.
- Workflow plus clair entre métier et développement.

# ADR-004 - Domaines autorisés obligatoires

## Statut

Proposé.

## Contexte

L'extension peut s'attacher à des onglets et manipuler des données sensibles. Le risque principal est l'usage sur des environnements non prévus.

## Décision

Le MVP impose une whitelist de domaines. L'enregistrement est bloqué sur les domaines interdits ou inconnus.

## Conséquences

- Réduction du risque de fuite.
- Configuration nécessaire par environnement.
- Messages d'erreur à prévoir pour l'utilisateur.
