# Scenario Capture MVP

Extension Chrome/Edge interne pour capturer un parcours metier, ajouter des controles attendus dans la chronologie, puis transmettre aux developpeurs/QA un export structure et un brouillon Playwright.

Le test Playwright final reste cree, stabilise et valide par les developpeurs ou QA automation.

## Etat actuel

Le projet contient un MVP fonctionnel sous Manifest V3.

Fonctionnalites disponibles :

- panneau lateral persistant via `sidePanel`, avec fallback possible cote background ;
- theme sombre par defaut et theme clair activable ;
- capture des actions principales : clic, saisie, selection, case cochee/decochee ;
- fusion des saisies successives dans un meme champ, meme apres une pause ;
- detection basique des champs sensibles et masquage des valeurs sensibles ;
- survol type Playwright recorder pendant l'enregistrement uniquement ;
- affichage du locator sous le curseur avec highlight de l'element cible ;
- generation de selecteurs plus stables pour les champs de saisie (`id`, `name`, `placeholder`, puis chemin CSS) ;
- timeline unique melangeant actions et controles dans l'ordre reel de capture ;
- ajout de controles guides : visible, texte, valeur, URL, titre ;
- ciblage d'un controle directement dans la page ;
- edition du libelle metier de chaque action ou controle ;
- commentaires metier par action ou controle ;
- affichage du resultat attendu uniquement lorsqu'il a ete renseigne par l'utilisateur ;
- suppression d'une action ou d'un controle depuis la timeline ;
- compteur d'actions, compteur de controles et indicateur de qualite des selecteurs ;
- apercu Playwright dans un style proche de Playwright CRX / VS Code sombre ;
- service `RecorderEngine` isole pour encapsuler le moteur de capture actuel et preparer une integration Playwright CRX ;
- rapport locator avec suggestions `data-testid` pour les selecteurs a relire ;
- copie du JSON, copie du brouillon Playwright et export ZIP local.

## Structure

- `manifest.json` : declaration Manifest V3, permissions et side panel.
- `src/background.js` : etat de capture, stockage local, timeline, export JSON.
- `src/recorder-engine.js` : frontiere technique du moteur de capture.
- `src/export-service.js` : generation du draft Playwright, rapports et ZIP.
- `src/content-recorder.js` : capture DOM, selecteurs, survol, ciblage d'assertions, masquage sensible.
- `src/popup.html` : interface du panneau metier.
- `src/popup.css` : design, themes, timeline, apercu code.
- `src/popup.js` : rendu UI, edition des libelles, controles, export et apercu Playwright.
- `docs/` : dossier de cadrage initial, specifications, backlog, risques et runbook.

## Installation locale

1. Ouvrir `chrome://extensions` ou `edge://extensions`.
2. Activer le mode developpeur.
3. Cliquer sur `Charger l'extension non empaquetee`.
4. Selectionner le dossier racine du projet.
5. Epingler l'extension si necessaire.
6. Cliquer sur l'icone `Scenario Capture` pour ouvrir le panneau lateral.

Apres chaque modification du code, cliquer sur `Recharger` dans `chrome://extensions`, puis recharger aussi la page testee si le script de contenu doit etre reinjecte.

## Utilisation

1. Ouvrir l'application a tester.
2. Ouvrir l'extension.
3. Dans `Parcours`, renseigner le titre du scenario et l'environnement.
4. Cliquer sur `Enregistrer`.
5. Realiser le parcours metier dans la page.
6. Ajouter des controles depuis le bloc `Ajouter un controle`.
7. Modifier si besoin les libelles affiches dans la timeline.
8. Relire l'onglet `Export`.
9. Copier le JSON, copier le code, ou exporter le ZIP complet.

## Export actuel

L'extension peut copier le JSON seul ou telecharger un ZIP complet.

Le ZIP contient :

- `scenario.json` : brief minimal pour creer le test Playwright ;
- `draft.spec.ts` : brouillon Playwright ;
- `reports/locator-report.json` : locators a utiliser ou stabiliser, avec suggestions `data-testid` ;
- `reports/sensitive-data-report.json` : entrees masquees a remplacer par fixtures ou variables de test ;
- `screenshots/*.png` : captures associees aux actions/controles lorsque le navigateur les autorise.

Le fichier `scenario.json` contient notamment :

- le contexte minimal du scenario : titre, environnement, URL de depart ;
- les actions capturees ;
- les controles attendus ;
- une propriete `journey` qui conserve l'ordre commun actions/controles ;
- les selecteurs proposes et leur niveau de confiance ;
- des indices Playwright (`playwrightHint`) pour aider les devs/QA ;
- les commentaires metier saisis dans la timeline.

Important : l'export est un brouillon exploitable, pas un test final pret a merger.

## Verification locale

Commande principale :

```powershell
npm run check
```

Equivalent detaille :

```powershell
node --check src/background.js
node --check src/content-recorder.js
node --check src/popup.js
```

## Ce qui est couvert par le MVP actuel

Le MVP couvre deja une partie importante du cadrage :

- socle extension MV3 chargeable en local ;
- panneau lateral metier ;
- demarrage, pause et remise a zero de la capture ;
- capture des actions utilisateur principales ;
- ajout de controles guides ;
- timeline lisible par les metiers ;
- libelles modifiables ;
- commentaires metier par etape ;
- qualite de locator high / medium / low ;
- rapport locator avec suggestions `data-testid` ;
- masquage basique des champs sensibles ;
- export ZIP avec scenario, draft, rapports et captures ;
- documentation de demarrage.

## Reste a faire

Priorite haute avant pilote :

- remplacer `host_permissions: ["<all_urls>"]` par une vraie whitelist de domaines recette/staging ;
- ajouter une page options administrateur pour les domaines autorises et les attributs de test id ;
- enrichir le ZIP avec captures avant/apres action et non uniquement les captures disponibles au moment de la capture ;
- brancher un adaptateur Playwright CRX derriere `RecorderEngine` si la capture officielle devient necessaire ;
- ajouter une validation bloquante ou un avertissement si aucun controle n'est present ;
- renforcer le masquage des donnees sensibles : emails, tokens, chaines longues, telephones selon les regles internes ;
- ajouter des tests automatises sur la logique pure : export, fusion des saisies, ordre de timeline, masquage.

Priorite moyenne :

- trace Playwright optionnelle ;
- import CLI cote repo Playwright ;
- rapport de diagnostics ;
- packaging release interne ;
- CI avec lint, tests, scan secrets et build extension.

Hors MVP / V2 :

- integration GitHub/Jira ;
- envoi vers API interne ;
- scenarios multi-onglets avances ;
- iframes complexes ;
- assertions reseau ou visuelles ;
- synchronisation serveur ou authentification.

## Securite

Points deja pris en compte :

- pas d'appel reseau externe dans le MVP ;
- stockage local navigateur ;
- masquage des mots de passe et champs nommes comme secrets, tokens, OTP ou MFA ;
- export considere comme brouillon a relire.

Points a traiter avant pilote :

- validation des permissions ;
- limitation stricte aux domaines autorises ;
- revue des donnees exportees ;
- documentation d'installation, desinstallation et maintenance ;
- procedure de release interne.

## Documentation projet

Les documents de cadrage sont dans `docs/` :

- `01_Cahier_des_charges.md`
- `02_Specifications_fonctionnelles.md`
- `03_Specifications_techniques.md`
- `04_Modele_donnees_et_exports.md`
- `05_Backlog_MVP.md`
- `06_Securite_Risques_Maintenance.md`
- `07_Runbook_demarrage_dev.md`
- `08_Templates_tickets.md`
- `09_ADR_initiales.md`

Ces documents decrivent la cible complete. Le present README decrit l'etat reel du MVP dans ce depot.
