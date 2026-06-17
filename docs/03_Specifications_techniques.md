# Spécifications techniques

**Projet :** Extension métier de capture de scénarios Playwright  
**Document :** 03_ST  
**Version :** v0.1 - Dossier de lancement  
**Date :** 17 juin 2026  
**Statut :** Draft de démarrage  

---


## 1. Choix technique général

L'extension est une extension Chrome/Edge Manifest V3 écrite en TypeScript. L'interface métier peut être réalisée en React ou en Web Components. Le moteur de capture s'appuie sur un fork ou mirror interne de Playwright CRX, encapsulé derrière une couche `RecorderEngine` afin de limiter la dépendance directe à l'API externe.

## 2. Rôle de Playwright CRX

Playwright CRX fournit une version Chrome Extension de Playwright et embarque le recorder Playwright utilisé par `playwright codegen`. Il s'appuie sur `chrome.debugger` pour implémenter le transport Playwright. Il expose aussi une API utilisable depuis un service worker d'extension, par exemple `crx.start()` puis `crxApp.attach(tabId)`.

La solution interne ne doit pas appeler Playwright CRX partout. Elle doit passer par un adaptateur interne.

```ts
export interface RecorderEngine {
  start(tabId: number): Promise<RecordingSession>;
  pause(sessionId: string): Promise<void>;
  resume(sessionId: string): Promise<void>;
  stop(sessionId: string): Promise<RecordingResult>;
  detach(sessionId: string): Promise<void>;
}
```

## 3. Architecture logique

```text
Extension MV3
├── background service worker
│   ├── RecorderEngineAdapter
│   ├── ExportService
│   ├── SecurityGuard
│   ├── StorageService
│   └── TicketingClient
│
├── side panel
│   ├── ScenarioForm
│   ├── StepTimeline
│   ├── AssertionBuilder
│   ├── LocatorQualityPanel
│   └── ExportPanel
│
├── content scripts
│   ├── element metadata collector
│   ├── overlay/highlight helper
│   └── sensitive field detector
│
├── options page
│   ├── domains whitelist
│   ├── test id attribute configuration
│   ├── masking rules
│   └── export settings
│
└── shared packages
    ├── scenario-contracts
    ├── playwright-draft-generator
    └── locator-quality
```

## 4. Modules recommandés

| Module | Responsabilité |
|---|---|
| `recorder-engine` | Encapsulation de Playwright CRX, attach/detach, start/stop, tracing. |
| `business-ui` | Panneau métier, formulaires, timeline, assertions. |
| `scenario-contracts` | Types TypeScript et JSON Schema du format d'export. |
| `locator-quality` | Score, règles de fragilité, suggestions `data-testid`. |
| `sensitive-data` | Détection et masquage de secrets. |
| `exporter` | Génération ZIP, `scenario.json`, `draft.spec.ts`, `metadata.json`. |
| `importer-cli` | Outil côté repo Playwright pour transformer l'export en draft. |
| `ticketing` | Intégration GitHub/Jira optionnelle. |

## 5. Permissions Chrome envisagées

Permissions à valider :

- `debugger` pour permettre à Playwright CRX de contrôler l'onglet via CDP.
- `tabs` pour identifier l'onglet actif.
- `activeTab` pour limiter l'accès au contexte explicitement activé.
- `storage` pour conserver options et sessions temporaires.
- `scripting` pour injecter des helpers si nécessaire.
- `sidePanel` pour afficher l'interface métier dans un panneau latéral.
- `downloads` si l'export ZIP est téléchargé localement.

Principe : demander le minimum nécessaire et documenter chaque permission.

## 6. Manifest MV3 indicatif

```json
{
  "manifest_version": 3,
  "name": "Business Playwright Recorder",
  "version": "0.1.0",
  "description": "Capture de scénarios métier pour génération de brouillons Playwright.",
  "permissions": ["activeTab", "tabs", "storage", "scripting", "debugger", "sidePanel", "downloads"],
  "host_permissions": ["https://recette.example.com/*", "https://staging.example.com/*"],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_title": "Recorder métier"
  },
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "options_page": "options.html"
}
```

## 7. Stratégie repository

Structure conseillée :

```text
business-playwright-recorder/
├── packages/
│   ├── extension/
│   ├── recorder-engine-playwright-crx/
│   ├── scenario-contracts/
│   ├── playwright-draft-generator/
│   ├── locator-quality/
│   ├── sensitive-data/
│   └── scenario-importer-cli/
├── vendor/
│   └── playwright-crx/            # option si mirror monorepo
├── docs/
├── examples/
└── .github/workflows/
```

## 8. Stratégie fork et dépendance

Options :

1. Mirror interne du repo Playwright CRX et publication d'un package interne.
2. Sous-module ou subtree dans `vendor/playwright-crx`.
3. Dépendance Git pinée sur un commit interne pour le POC.

Recommandation : package interne ou workspace monorepo pour éviter une dépendance directe au package public.

## 9. Build et CI

Pipeline minimal :

- Installation dépendances.
- Typecheck TypeScript.
- Lint.
- Tests unitaires des modules purs.
- Build extension MV3.
- Scan secrets.
- Génération d'un ZIP d'extension.
- Tests smoke avec chargement unpacked si l'environnement CI le permet.

## 10. Observabilité et debug

- Journaliser les erreurs d'attachement d'onglet.
- Journaliser les refus liés aux domaines interdits.
- Exporter un `diagnostics.json` dans le ZIP en mode debug.
- Ne jamais journaliser les valeurs masquées.

## 11. Compatibilité navigateurs

Support MVP : Chrome stable et Edge Chromium stable. Le support Firefox n'est pas retenu pour le MVP car la stratégie repose sur `chrome.debugger` et Manifest V3 Chrome/Chromium.

## 12. Points techniques à prototyper rapidement

1. Attacher l'onglet courant via Playwright CRX depuis un service worker MV3.
2. Démarrer/stopper un recording et récupérer le code ou le flux interne.
3. Produire une trace Playwright sans fuite de secret.
4. Interagir proprement entre background service worker et side panel.
5. Valider les permissions avec la sécurité interne.
