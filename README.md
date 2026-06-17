# Scenario Capture MVP

Extension Chrome/Edge interne pour capturer un scénario métier, ajouter les assertions attendues et exporter un brouillon structuré exploitable par les développeurs Playwright.

Le test final reste créé, relu et validé par les développeurs/QA.

## Contenu

- `manifest.json`: déclaration Manifest V3.
- `src/background.js`: état de capture, stockage local, export.
- `src/content-recorder.js`: capture des clics, saisies, sélections et ciblage d'assertions.
- `src/popup.html`, `src/popup.css`, `src/popup.js`: interface métier.
- `docs/export-model.md`: contrat JSON du MVP.
- `docs/runbook-dev.md`: chargement et vérification locale.

## Utilisation rapide

1. Charger le dossier en extension non empaquetée dans Chrome ou Edge.
2. Ouvrir l'application métier.
3. Démarrer l'enregistrement depuis le popup.
4. Parcourir le scénario.
5. Ajouter les assertions.
6. Exporter le JSON.

## Sécurité et maintenance

- Les champs sensibles sont masqués.
- Le stockage est local au navigateur.
- Les sélecteurs et les indices Playwright sont des brouillons.
- Aucun appel réseau externe n'est effectué par l'extension MVP.
