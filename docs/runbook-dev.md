# Runbook d?veloppeur

## Charger l'extension

1. Ouvrir `chrome://extensions` ou `edge://extensions`.
2. Activer le mode d?veloppeur.
3. Cliquer sur "Charger l'extension non empaquet?e".
4. S?lectionner le dossier racine du projet.

## Parcours MVP

1. Ouvrir l'application ? tester.
2. Cliquer sur l'ic?ne de l'extension pour ouvrir le panneau "Scenario Capture".
3. Dans `Parcours`, renseigner le titre et l'environnement.
4. Cliquer sur "Enregistrer".
5. R?aliser le parcours m?tier en gardant le panneau ouvert.
6. Ajouter les contr?les attendus directement dans `Parcours`:
   - "Cibler sur la page" pour s?lectionner un ?l?ment.
   - "Ajouter depuis la page" pour une assertion d'URL ou de titre.
7. Dans `Export`, relire l'aper?u Playwright et le log locator, puis transmettre le JSON ? l'?quipe dev/QA.

## V?rifications locales

```powershell
node --check src/background.js
node --check src/content-recorder.js
node --check src/popup.js
```

## Limites assum?es du MVP

- Pas de g?n?ration automatique de fichier `.spec.ts`.
- Pas d'authentification ni de synchronisation serveur.
- Pas de capture r?seau ou de donn?es applicatives internes.
- Les s?lecteurs restent des propositions; ils doivent ?tre revus.
- Les sc?narios multi-onglets et iframes complexes sont hors MVP.
- Le panneau lat?ral est utilis? quand le navigateur le supporte; sinon l'extension ouvre une fen?tre persistante.
