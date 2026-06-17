# Runbook de démarrage développeur

**Projet :** Extension métier de capture de scénarios Playwright  
**Document :** 07_RUNBOOK  
**Version :** v0.1 - Dossier de lancement  
**Date :** 17 juin 2026  
**Statut :** Draft de démarrage  

---


## 1. Pré-requis

- Node.js LTS validée par l'équipe.
- npm, pnpm ou yarn selon standard interne.
- Chrome ou Edge Chromium.
- Accès au fork/mirror interne de Playwright CRX.
- Accès au repo de l'extension.
- Environnement de recette autorisé.

## 2. Initialisation repo proposée

```bash
git clone git@github.com:organisation/business-playwright-recorder.git
cd business-playwright-recorder
npm ci
npm run build
```

## 3. Chargement local de l'extension

1. Ouvrir `chrome://extensions`.
2. Activer le mode développeur.
3. Cliquer sur `Load unpacked`.
4. Sélectionner `packages/extension/dist`.
5. Ouvrir une page de recette autorisée.
6. Cliquer sur l'icône de l'extension.

## 4. Scripts npm recommandés

```json
{
  "scripts": {
    "dev": "vite --watch",
    "build": "npm run typecheck && vite build",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "test": "vitest run",
    "package:extension": "node scripts/package-extension.js",
    "import:recording": "node packages/scenario-importer-cli/dist/index.js"
  }
}
```

## 5. Première preuve technique

Objectif du spike :

1. Démarrer le background service worker.
2. Ouvrir le side panel.
3. Appeler `crx.start()` via l'adaptateur.
4. Attacher l'onglet courant.
5. Exécuter une action simple ou récupérer un recording.
6. Détacher l'onglet et libérer `chrome.debugger`.
7. Exporter un `scenario.json` minimal.

## 6. Exemple d'adaptateur

```ts
import { crx } from '@internal/playwright-crx';

export class PlaywrightCrxRecorderEngine {
  private app: Awaited<ReturnType<typeof crx.start>> | null = null;

  async start(tabId: number) {
    this.app = await crx.start({ slowMo: 100 });
    const page = await this.app.attach(tabId);
    return { sessionId: crypto.randomUUID(), page };
  }

  async close(page: unknown) {
    if (!this.app) return;
    await this.app.detach(page as never);
    await this.app.close();
    this.app = null;
  }
}
```

## 7. Checks avant merge

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- Build extension sans erreur.
- Chargement local dans Chrome.
- Test manuel sur domaine autorisé.
- Test manuel sur domaine interdit.
- Export ZIP vérifié.

## 8. Debug courant

| Symptôme | Cause probable | Action |
|---|---|---|
| L'extension ne s'attache pas à l'onglet | Permission ou domaine non autorisé | Vérifier manifest et whitelist. |
| Le service worker s'arrête | Comportement normal MV3 | Persister l'état minimal et gérer reprise. |
| Le ZIP est incomplet | Flux d'export interrompu | Vérifier logs background et storage temporaire. |
| Donnée sensible visible | Règle de masquage manquante | Ajouter test et règle `sensitive-data`. |
| Locator fragile | DOM sans attribut stable | Ajouter suggestion `data-testid`. |
