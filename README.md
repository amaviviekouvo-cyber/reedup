# ReedUp

Application e-santé de suivi de rééducation à domicile, entre deux séances chez le kiné.
Le patient planifie, coche ou reporte ses séances ; un bilan hebdomadaire honnête
aide à en parler avec le kiné.

> Prototype pédagogique (ISEN Toulon, option e-santé). Données fictives uniquement.
> Ce n'est pas un dispositif médical : aucun diagnostic, aucun conseil médical automatique.

## Lancer

Ouvrir `index.html` dans un navigateur, ou http://localhost/Reedup avec XAMPP.
HTML, CSS et JavaScript, sans framework ni installation.

## Fonctionnalités

- **Aujourd'hui** : séances du jour, douleur et fatigue de 0 à 10
- **Semaine** : glisser-déposer, modification, report
- **Mois** : assiduité par jour
- **Bilan** : assiduité, minutes, douleur, fatigue, reports, export PDF
- **Programme** : séances récurrentes (« cette séance » ou « toutes les suivantes »)
- **Vue kiné** : plusieurs patients, repères doux
- **Biosensor** : import de mesures de mouvement CSV ou JSON

## Organisation du code

| Fichier | Rôle |
|---|---|
| `js/dates.js` | calculs sur les dates |
| `js/data.js` | données, sauvegarde (localStorage), démo |
| `js/stats.js` | assiduité, moyennes, repères |
| `js/biosensor.js` | import et courbes du capteur |
| `js/dialog.js` | fenêtre d'une séance |
| `js/vues-patient.js` | Aujourd'hui, Semaine, Mois |
| `js/bilan.js`, `js/programme.js`, `js/kine.js` | les autres vues |
| `app.js` | navigation et affichage |

Toutes les vues lisent la même liste : `state.sessions`.

## Règles de calcul

- Assiduité = séances faites / séances échues (faites + manquées). Les séances à venir ne pénalisent pas.
- Une séance reportée et replacée dans la même semaine ne compte qu'une fois, via sa remplaçante. Sans remplaçante dans la semaine, elle compte comme manquée.
- Repères kiné : douleur moyenne en hausse d'au moins 1 point entre les 7 derniers jours et les 7 précédents (2 notes minimum de chaque côté), ou au moins 2 reports sur 14 jours. Seuils de démonstration, sans valeur clinique.

## Format biosensor

CSV (séparateur `;` ou `,`) :

```
date;amplitude;regularite
2026-11-20;22,5;78
```

JSON :

```json
{ "measures": [{ "date": "2026-11-20", "amplitude": 22.5, "regularity": 78 }] }
```

Amplitude en degrés (0 à 180), régularité en % (0 à 100). Chaque mesure est attachée
à la séance d'équithérapie faite à la même date. Le bilan propose un fichier d'exemple.

## Limites

Pas de compte ni de serveur : les données restent dans le navigateur, et la vue kiné
est une simulation avec des patients fictifs. Une version réelle demanderait
authentification, hébergement de données de santé certifié (HDS) et conformité RGPD.
