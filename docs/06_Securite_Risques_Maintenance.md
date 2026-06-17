# Sécurité, risques et maintenance

**Projet :** Extension métier de capture de scénarios Playwright  
**Document :** 06_SECURITE  
**Version :** v0.1 - Dossier de lancement  
**Date :** 17 juin 2026  
**Statut :** Draft de démarrage  

---


## 1. Risques principaux

| Risque | Impact | Probabilité | Mitigation |
|---|---:|---:|---|
| Permission `debugger` sensible | Elevé | Moyen | Audit sécurité, domaines autorisés, usage explicite, documentation. |
| Fuite de données sensibles dans exports | Elevé | Moyen | Masquage, interdiction prod, scan ZIP, règles de redaction. |
| Fragilité des locators générés | Moyen | Elevé | Score, suggestions `data-testid`, revue dev obligatoire. |
| Dépendance à Playwright CRX non officiel | Moyen | Moyen | Fork/mirror interne, pin version, couche adaptateur. |
| Evolution Chrome/Edge MV3 | Moyen | Moyen | Tests smoke, veille release, CI sur versions stables. |
| Evolution Playwright | Moyen | Moyen | Stratégie de mise à jour contrôlée, tests de non-régression. |
| Usage sur production | Elevé | Faible à moyen | Whitelist stricte, bannière environnement, blocage prod. |
| Confusion métier : export = test final | Moyen | Moyen | UX et documentation explicites. |

## 2. Permissions à justifier

| Permission | Justification | Garde-fou |
|---|---|---|
| `debugger` | Nécessaire au moteur Playwright CRX pour s'attacher à l'onglet. | Domaine autorisé, attachement explicite, détachement à l'arrêt. |
| `tabs` | Lire l'URL et l'identifiant de l'onglet courant. | Pas de collecte globale, usage local. |
| `activeTab` | Limiter l'accès à l'onglet activé par l'utilisateur. | Action utilisateur requise. |
| `storage` | Options et état temporaire. | Pas de secret stocké durablement. |
| `scripting` | Injection de helpers si nécessaire. | Injection uniquement sur domaines autorisés. |
| `sidePanel` | Interface métier persistante. | Aucun accès réseau par défaut. |
| `downloads` | Export ZIP local. | Nom de fichier standardisé, scan avant génération. |

## 3. Données sensibles

Données à masquer automatiquement :

- Champs `type=password`.
- Emails internes si configuré.
- Tokens JWT ou chaînes longues ressemblant à des secrets.
- Numéros de téléphone.
- Identifiants personnels selon règles internes.
- Valeurs de cookies, localStorage, sessionStorage sauf autorisation explicite.

Remplacement recommandé :

```ts
await page.getByLabel('Email').fill(process.env.TEST_USER_EMAIL!);
await page.getByLabel('Mot de passe').fill(process.env.TEST_USER_PASSWORD!);
```

## 4. Politique d'environnement

MVP : autoriser seulement les environnements de recette ou staging.

Exemple :

```json
{
  "allowedOrigins": [
    "https://recette.example.com",
    "https://staging.example.com"
  ],
  "blockedOrigins": [
    "https://production.example.com"
  ]
}
```

## 5. Maintenance Playwright CRX

Actions recommandées :

1. Fork/mirror interne.
2. Tag interne de référence : `v0.15.0-internal.0` ou équivalent.
3. Package interne ou workspace monorepo.
4. Couche `RecorderEngine` pour isoler l'API.
5. Tests smoke d'attachement, recording, assertions, tracing.
6. Veille sur Chrome MV3 et Playwright.
7. Revue sécurité à chaque montée de version.

## 6. Checklist avant pilote métier

- Permissions validées par la sécurité.
- Domaines autorisés configurés.
- Données sensibles masquées dans un export de test.
- Documentation utilisateur métier rédigée.
- Documentation dev d'import rédigée.
- Procédure de désinstallation disponible.
- Responsable de maintenance identifié.
