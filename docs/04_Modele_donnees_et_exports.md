# Modèle de données et exports

**Projet :** Extension métier de capture de scénarios Playwright  
**Document :** 04_MODELES  
**Version :** v0.1 - Dossier de lancement  
**Date :** 17 juin 2026  
**Statut :** Draft de démarrage  

---


## 1. Principe

Le fichier `scenario.json` est la source de vérité. Le fichier Playwright généré est un brouillon dérivé. Cette décision permet de changer plus tard de moteur de génération sans perdre les scénarios métier.

## 2. Structure ZIP

```text
recording-<slug>-<date>.zip
├── scenario.json
├── draft.spec.ts
├── metadata.json
├── locator-report.json
├── sensitive-data-report.json
├── screenshots/
│   ├── step-001-before.png
│   ├── step-001-after.png
│   └── step-002-after.png
└── traces/
    └── trace.zip
```

## 3. Exemple `scenario.json`

```json
{
  "schemaVersion": "1.0.0",
  "title": "Recherche d'offres par ville",
  "feature": "Recherche emploi",
  "environment": "recette",
  "baseUrl": "https://recette.example.com",
  "createdBy": {
    "displayName": "Utilisateur métier",
    "team": "Métier"
  },
  "preconditions": [
    "Utilisateur connecté",
    "Des offres existent pour Rennes"
  ],
  "testData": {
    "city": "Rennes"
  },
  "steps": [
    {
      "id": "step-001",
      "type": "fill",
      "humanLabel": "Saisir Rennes dans le champ Ville",
      "locator": {
        "strategy": "label",
        "value": "Ville",
        "quality": "good"
      },
      "value": "Rennes",
      "generatedCode": "await page.getByLabel('Ville').fill('Rennes');",
      "comments": []
    },
    {
      "id": "step-002",
      "type": "click",
      "humanLabel": "Cliquer sur Rechercher",
      "locator": {
        "strategy": "role",
        "role": "button",
        "name": "Rechercher",
        "quality": "excellent"
      },
      "generatedCode": "await page.getByRole('button', { name: 'Rechercher' }).click();",
      "comments": []
    }
  ],
  "assertions": [
    {
      "id": "assert-001",
      "type": "visible",
      "humanLabel": "La liste des résultats doit être visible",
      "locator": {
        "strategy": "testId",
        "value": "jobs-results",
        "quality": "excellent"
      },
      "generatedCode": "await expect(page.getByTestId('jobs-results')).toBeVisible();"
    }
  ],
  "businessExpectedResult": "Les offres correspondant à Rennes sont affichées.",
  "export": {
    "draftGenerated": true,
    "traceIncluded": true,
    "screenshotsIncluded": true
  }
}
```

## 4. Interfaces TypeScript

```ts
export type LocatorQuality = 'excellent' | 'good' | 'medium' | 'fragile';

export interface ScenarioExport {
  schemaVersion: string;
  title: string;
  feature?: string;
  environment: string;
  baseUrl: string;
  preconditions: string[];
  testData: Record<string, unknown>;
  steps: ScenarioStep[];
  assertions: ScenarioAssertion[];
  businessExpectedResult: string;
  export: ExportMetadata;
}

export interface ScenarioStep {
  id: string;
  type: 'navigation' | 'click' | 'fill' | 'select' | 'check' | 'press' | 'comment';
  humanLabel: string;
  locator?: LocatorInfo;
  value?: unknown;
  generatedCode?: string;
  comments: string[];
}

export interface LocatorInfo {
  strategy: 'testId' | 'role' | 'label' | 'placeholder' | 'text' | 'css' | 'xpath';
  value?: string;
  role?: string;
  name?: string;
  quality: LocatorQuality;
  reason?: string;
  suggestion?: string;
}

export interface ScenarioAssertion {
  id: string;
  type: 'visible' | 'text' | 'value' | 'url' | 'enabled' | 'disabled';
  humanLabel: string;
  locator?: LocatorInfo;
  expected?: unknown;
  generatedCode?: string;
}

export interface ExportMetadata {
  draftGenerated: boolean;
  traceIncluded: boolean;
  screenshotsIncluded: boolean;
}
```

## 5. Exemple de brouillon Playwright généré

```ts
import { test, expect } from '@playwright/test';

test.describe('Recherche emploi', () => {
  test('Recherche d'offres par ville', async ({ page }) => {
    await test.step('Préconditions', async () => {
      // TODO dev: utiliser la fixture de connexion et les données de test du projet.
    });

    await test.step('Saisir Rennes dans le champ Ville', async () => {
      await page.getByLabel('Ville').fill('Rennes');
    });

    await test.step('Cliquer sur Rechercher', async () => {
      await page.getByRole('button', { name: 'Rechercher' }).click();
    });

    await test.step('La liste des résultats doit être visible', async () => {
      await expect(page.getByTestId('jobs-results')).toBeVisible();
    });
  });
});
```

## 6. Versionnement du schéma

Le champ `schemaVersion` est obligatoire. Les changements incompatibles doivent incrémenter la version majeure. L'importer CLI doit refuser proprement un schéma non supporté et afficher une consigne de migration.
