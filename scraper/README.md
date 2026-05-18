# Scraper SportMap Paris

Récupère les spots sportifs de Paris via **Google Places API** et les importe dans la base D1 Cloudflare.

## Pré-requis

- Node 18+
- Une clé **Google Places API (New)** activée sur [console.cloud.google.com](https://console.cloud.google.com)
- `wrangler` installé globalement (`npm i -g wrangler`)

---

## Étape 1 — Scraper Google Maps

```bash
GOOGLE_API_KEY=AIza... node scraper/scrape.js
```

Cela génère `scraper/spots_paris.json` avec tous les spots trouvés (football, basket, piscines, salles de sport, escalade, yoga, etc.).

---

## Étape 2 — Importer dans la base de données

### Base locale (dev)
```bash
node scraper/import_to_db.js
```

### Base distante (production Cloudflare)
```bash
node scraper/import_to_db.js --remote
```

---

## Catégories scrapées

| Sport | Type | Prix par défaut |
|---|---|---|
| Football | fun | gratuit |
| Basketball | fun | gratuit |
| Volleyball | fun | gratuit |
| Handball | fun | gratuit |
| Pétanque | fun | gratuit |
| Skateboard | fun | gratuit |
| Roller | fun | gratuit |
| Athlétisme | training | gratuit |
| Rugby | fun | gratuit |
| Ping-pong | fun | gratuit |
| Parcours fitness | fun | gratuit |
| Tennis | training | payant |
| Natation | training | payant |
| Musculation | training | payant |
| Boxe | training | payant |
| Judo | training | payant |
| Escalade | training | payant |
| Yoga | training | payant |
| Crossfit | training | payant |
| Danse | training | payant |
| Badminton | training | payant |
| Patinage | fun | payant |
| Golf | training | payant |
| Karaté | training | payant |

---

## Notes

- Les doublons sont ignorés grâce à `INSERT OR IGNORE` (basé sur la clé primaire).
- Tous les spots importés ont le statut `approved` (directement visibles sur la carte).
- Le fichier `spots_paris.json` peut être réutilisé sans relancer le scraper.
