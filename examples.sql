ALTER TABLE plaatsvoorkeur DROP CONSTRAINT "marktid_erkenningsnummer_plaatsid_key";
ALTER TABLE voorkeur DROP CONSTRAINT "voorkeur_erkenningsnummer_marktid_marktdate_key";

-- Add contraint
ALTER TABLE plaatsvoorkeur ADD CONSTRAINT marktId_erkenningsNummer_plaatsId_key UNIQUE ("marktId", "erkenningsNummer", "plaatsId");
ALTER TABLE voorkeur ADD CONSTRAINT voorkeur_erkenningsnummer_marktid_marktdate_key UNIQUE ("marktId", "erkenningsNummer", "marktDate");

-- Find with nummer
SELECT * FROM plaatsvoorkeur WHERE "erkenningsNummer" = 'erkenningsNummer';