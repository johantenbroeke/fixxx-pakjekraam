# Fixxx Kies je kraam

### Uitvoeren met Node.js webserver (alleen voor development)

Draai `npm install`.

Maak een bestand genaamd `.env`, begin met de inhoud van `example.env` als basis. Vul in de `API_...` regels je inloggegevens in van Makkelijke Markt. Het bestand `.env` wordt niet gecommit in Git, dus je logingegevens zullen op je eigen computer blijven.

Om de database op te starten tijdens development draai je:

```shell
docker-compose up -d database
```

## Recreate DB in Docker

docker-compose up -d --no-deps --build --force-recreate database

Draai `(export $(cat .env) && npm run dev)` tijdens development (code wijzigen zorgt voor reload), of `npm run start` voor de echte versie.

### Installatie via Docker (development)

Je kunt ook opstarten via docker, via `docker compose up`.


### Compiling the SCSS

Om de SCSS naar CSS te compilen draai je `npm run watch`. Als je de wijzigingen wilt zien refresh je je browser.


### Compiling JS

You can simply run the command 'webpack'

### Berekening controleren

Kopieer output van een dagindeling op een markt uit de log tabel. Run vervolgens `(export $(cat .env-prod) && pbpaste | ts-node src/_debug_check-calc.js)`. (`pbpaste` gebruikt de gekopieerde output om deze als input voor het script door te geven).
