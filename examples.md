ALTER TABLE plaatsvoorkeur DROP CONSTRAINT "plaatsvoorkeur_marktId_erkenningsNummer_plaatsId_key";
ALTER TABLE voorkeur DROP CONSTRAINT "voorkeur_erkenningsNummer_marktId_marktDate_key";

# Add contraint
ALTER TABLE plaatsvoorkeur ADD CONSTRAINT marktId_erkenningsNummer_plaatsId_key UNIQUE (dist_id, zipcode);