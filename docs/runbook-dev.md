# Runbook développeur

## Charger l'extension

1. Ouvrir `chrome://extensions` ou `edge://extensions`.
2. Activer le mode développeur.
3. Cliquer sur "Charger l'extension non empaquetée".
4. Sélectionner le dossier racine du projet.

## Parcours MVP

1. Ouvrir l'application à tester.
2. Ouvrir le popup "Scenario Capture".
3. Renseigner le titre, l'application et l'environnement.
4. Cliquer sur "Démarrer".
5. Réaliser le parcours métier.
6. Mettre en pause.
7. Ajouter les assertions attendues:
   - "Cibler dans la page" pour sélectionner un élément.
   - "Ajouter page" pour une assertion d'URL ou de titre.
8. Exporter le JSON et le transmettre à l'équipe dev/QA.

## Vérifications locales

```powershell
node --check src/background.js
node --check src/content-recorder.js
node --check src/popup.js
```

## Limites assumées du MVP

- Pas de génération automatique de fichier `.spec.ts`.
- Pas d'authentification ni de synchronisation serveur.
- Pas de capture réseau ou de données applicatives internes.
- Les sélecteurs restent des propositions; ils doivent être revus.
- Les scénarios multi-onglets et iframes complexes sont hors MVP.
