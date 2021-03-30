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

Kopieer output van een dagindeling op een markt uit de log tabel. Run vervolgens `(export $(cat .env) && pbpaste | ts-node src/_debug_check-calc.js)`. (`pbpaste` gebruikt de gekopieerde output om deze als input voor het script door te geven).

Om een debugger te kunnen attachen bij het testen van de berekening: `(export $(cat .env) && nodemon --inspect --watch src/allocation --watch src/_debug_analyze-calc.js -e js,ts -r ts-node/register src/_debug_analyze-calc.js)`

### Installing postgres locally
https://www.robinwieruch.de/postgres-sql-macos-setup

### Start local Postgres DB
pg_ctl -D /usr/local/var/postgres start
pg_ctl -D /usr/local/var/postgres stop

### Open psql database
psql kjk

### Postgres "FATAL:  data directory "/usr/local/var/postgres" has invalid permissions"
sudo chmod 700 -R /usr/local/var/postgres

### Create user and add to DB
https://medium.com/coding-blocks/creating-user-database-and-adding-access-on-postgresql-8bfcd2f4a91e

### Migrations and database
For more information check ./migrations.md