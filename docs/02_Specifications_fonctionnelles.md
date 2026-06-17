# Spécifications fonctionnelles

**Projet :** Extension métier de capture de scénarios Playwright  
**Document :** 02_SF  
**Version :** v0.1 - Dossier de lancement  
**Date :** 17 juin 2026  
**Statut :** Draft de démarrage  

---


## 1. Parcours métier nominal

1. L'utilisateur ouvre l'application de recette.
2. Il clique sur l'icône de l'extension.
3. Il renseigne le nom du scénario, la fonctionnalité, les préconditions et le résultat attendu.
4. Il clique sur `Démarrer l'enregistrement`.
5. Il réalise le parcours dans l'application.
6. Le panneau latéral affiche les étapes capturées.
7. L'utilisateur ajoute au moins une assertion guidée.
8. Il relit les étapes, ajoute des commentaires si nécessaire.
9. Il clique sur `Terminer` puis `Exporter` ou `Envoyer aux devs`.
10. Les développeurs récupèrent le ZIP ou le ticket généré.

## 2. Ecrans de l'extension

### Popup rapide

- Statut : inactif, enregistrement, pause, erreur.
- Bouton : démarrer, pause, arrêter.
- Domaine courant et statut d'autorisation.
- Accès au panneau latéral.

### Panneau latéral métier

Sections attendues :

- Informations du scénario.
- Etapes enregistrées.
- Assertions.
- Données utilisées.
- Commentaires métier.
- Qualité des locators.
- Export.

### Page options administrateur

- Liste des domaines autorisés.
- Attribut de test id utilisé : `data-testid`, `data-cy`, autre.
- Niveau de masquage des données.
- Format de sortie : TypeScript, JavaScript.
- Activation/désactivation des traces.
- Endpoint d'envoi interne ou intégration ticketing.

## 3. Règles de gestion

| ID | Règle |
|---|---|
| RG-001 | Un scénario ne peut pas être soumis sans titre. |
| RG-002 | Un scénario ne peut pas être soumis sans au moins une assertion. |
| RG-003 | Les mots de passe ne sont jamais exportés en clair. |
| RG-004 | Un domaine non autorisé bloque l'enregistrement ou affiche un avertissement bloquant selon configuration. |
| RG-005 | Les URLs absolues sont remplacées par des chemins relatifs lorsque le domaine correspond à `baseURL`. |
| RG-006 | Un locator CSS ou XPath est marqué comme fragile par défaut. |
| RG-007 | Les étapes supprimées par le métier restent historisées dans `metadata.json` si l'option audit est activée. |
| RG-008 | Une trace Playwright ne doit pas contenir de secrets non masqués. |

## 4. Types d'étapes à capturer

| Type | Exemple métier | Exemple Playwright |
|---|---|---|
| navigation | Ouvrir la page de recherche | `await page.goto('/jobs');` |
| click | Cliquer sur Rechercher | `await page.getByRole('button', { name: 'Rechercher' }).click();` |
| fill | Saisir Rennes | `await page.getByLabel('Ville').fill('Rennes');` |
| select | Choisir CDI | `await page.getByLabel('Contrat').selectOption('CDI');` |
| check | Cocher Télétravail | `await page.getByLabel('Télétravail').check();` |
| assertion | La liste est visible | `await expect(page.getByTestId('results')).toBeVisible();` |
| comment | Attention aux offres archivées | Commentaire dans `scenario.json`. |

## 5. Assertions guidées

Assertions MVP :

- Un élément est visible.
- Un texte est visible.
- Un champ contient une valeur.
- L'URL contient une chaîne.
- Un bouton est activé/désactivé.
- Un message d'erreur est affiché.

Assertions V2 :

- Un tableau contient une ligne.
- Le nombre de résultats est supérieur à zéro.
- Une requête réseau a réussi.
- Un élément n'est pas visible.
- Une capture visuelle correspond à une baseline validée.

## 6. Qualité des locators

| Score | Locators | Traitement |
|---|---|---|
| Excellent | `getByTestId`, `getByRole` avec nom accessible unique | Accepté par défaut. |
| Bon | `getByLabel`, `getByPlaceholder` | Accepté, à vérifier si texte variable. |
| Moyen | `getByText` | Accepté avec avertissement si texte métier susceptible de changer. |
| Fragile | CSS, XPath, `nth-child`, id généré | Marqué comme action dev requise. |

## 7. Export utilisateur

Le métier peut choisir :

- Télécharger le ZIP.
- Copier un résumé Markdown pour ticket.
- Envoyer à une API interne.
- Créer un ticket GitHub/Jira si l'intégration est activée.

## 8. Message de fin d'enregistrement

Le message doit rappeler que le scénario généré est un brouillon technique destiné aux développeurs, et non un test final garanti.
