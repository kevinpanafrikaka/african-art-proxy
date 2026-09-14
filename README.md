# african-art-proxy

Cloudflare Worker qui archive les objets d'art africain de la **Smithsonian Open Access API**
(National Museum of African Art, `unit_code: NMAFA`) dans une base **D1**, et sert ces données
via une API REST à une app mobile. La clé Smithsonian ne quitte jamais le Worker.

## Architecture

- `src/smithsonian.js` — client pour l'API Smithsonian Open Access, filtré sur NMAFA.
- `src/db.js` — upsert D1 (`ON CONFLICT DO UPDATE`), état d'ingestion, logs.
- `src/ingest.js` — logique d'archivage : lit 100 objets par run, avance un curseur (`ingest_state`),
  boucle sur toute la collection au fil des runs cron.
- `src/index.js` — Worker : routes REST (lisent D1) + `scheduled()` (cron, lance l'ingestion).

## 1. Créer la base D1 (à exécuter toi-même)

```bash
npm install
npx wrangler d1 create african_art_db
```

Copie le `database_id` retourné dans `wrangler.jsonc` (remplace `REPLACE_AFTER_WRANGLER_D1_CREATE`).

Puis applique le schéma :

```bash
npx wrangler d1 execute african_art_db --remote --file=./schema.sql
```

Pour vérifier ensuite :

```bash
npx wrangler d1 execute african_art_db --remote --command="SELECT COUNT(*) FROM objects"
```

## 2. Secrets Cloudflare

Une fois le Worker déployé (voir §3), va dans le dashboard Cloudflare :
**Workers & Pages → african-art-proxy → Settings → Variables and Secrets**, et ajoute en secret :

- `SMITHSONIAN_API_KEY` — ta clé Smithsonian Open Access.
- `ADMIN_TOKEN` — une chaîne aléatoire longue, pour protéger le déclenchement manuel d'ingestion.

(En local, copie `.dev.vars.example` en `.dev.vars` et renseigne les mêmes valeurs pour `wrangler dev`.)

## 3. Déploiement (GitHub → Cloudflare)

1. Le code est poussé sur le repo GitHub `african-art-proxy`.
2. Dans le dashboard Cloudflare : **Workers & Pages → Create → Connect to Git**, sélectionne ce repo.
3. Cloudflare détecte `wrangler.jsonc` automatiquement (pas de build command à fournir).
4. Chaque `git push` sur la branche par défaut redéploie automatiquement le Worker.

## 4. Premier remplissage de la base

L'ingestion tourne automatiquement chaque jour à 3h (cron `0 3 * * *`, ~100 objets/jour).
Pour forcer un run immédiat (par ex. juste après le premier déploiement) :

```bash
curl -X POST https://african-art-proxy.<ton-sous-domaine>.workers.dev/api/admin/ingest \
  -H "x-admin-token: <ADMIN_TOKEN>"
```

## API pour l'app mobile

- `GET /api/objects?page=1&limit=20&q=mask&culture=Kongo&object_type=Mask`
  Liste paginée, filtrable par titre (`q`), culture, type d'objet.
- `GET /api/objects/:id`
  Détail complet d'un objet, y compris `raw` (JSON brut Smithsonian intégral).
- `GET /api/health`
  Health check.

## Développement local

```bash
npm install
npx wrangler dev
```
