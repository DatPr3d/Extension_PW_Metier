# Modèle d'export MVP

L'extension produit un fichier JSON destiné aux développeurs et QA. Il ne remplace pas le test Playwright final: il transporte le contexte métier, les étapes capturées, les assertions attendues et des indices de génération.

```json
{
  "schema": "internal.playwright-scenario-capture",
  "schemaVersion": "1.0",
  "exportedAt": "2026-06-17T12:00:00.000Z",
  "source": {
    "tool": "Scenario Capture MVP",
    "toolVersion": "0.1.0",
    "validationOwner": "dev-qa"
  },
  "scenario": {
    "title": "Création d'une demande",
    "description": "",
    "tags": [],
    "app": {
      "name": "Portail métier",
      "environment": "recette",
      "baseUrl": ""
    },
    "preconditions": [],
    "steps": [
      {
        "id": "step-001",
        "order": 1,
        "capturedAt": "2026-06-17T12:00:00.000Z",
        "page": {
          "url": "https://example.test",
          "title": "Accueil"
        },
        "actorIntent": "",
        "action": {
          "kind": "click",
          "selector": {
            "primary": "[data-testid=\"submit\"]",
            "strategy": "testId",
            "alternatives": ["#submit"]
          },
          "label": "Valider",
          "tagName": "button"
        },
        "selectorConfidence": "high",
        "notes": "",
        "playwrightHint": "await page.locator(\"[data-testid=\\\"submit\\\"]\").click();"
      }
    ],
    "assertions": [
      {
        "id": "assertion-001",
        "order": 1,
        "kind": "text",
        "expected": "Demande créée",
        "selector": {
          "primary": "[data-testid=\"toast\"]",
          "strategy": "testId",
          "alternatives": []
        },
        "observed": {
          "text": "Demande créée"
        }
      }
    ]
  }
}
```

## Règles MVP

- Les champs sensibles sont masqués pour les inputs de type `password` ou nommés comme secrets, tokens, OTP ou MFA.
- Les sélecteurs sont classés par confiance: `high`, `medium`, `low`.
- Les `playwrightHint` sont des aides, pas du code validé.
- Les développeurs gardent la responsabilité de factoriser, stabiliser les sélecteurs, gérer les jeux de données et valider les assertions.
