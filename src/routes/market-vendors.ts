import { Request, Response, NextFunction } from 'express';
import { getIndelingslijstInput, getSollicitantenlijstInput, getVoorrangslijstInput, getToewijzingslijst } from '../pakjekraam-api';
import { internalServerErrorPage, HTTP_INTERNAL_SERVER_ERROR, httpErrorPage } from '../express-util';

import Indeling from '../allocation/indeling';

export const vasteplaatshoudersPage = (req: Request, res: Response) => {
    const datum = req.params.datum;
    const type = 'vasteplaatshouders';
    getIndelingslijstInput(req.params.marktId, datum).then((data: any) => {
        res.render('VastplaatshoudersPage', { data, datum, type });
    }, internalServerErrorPage(res));
};

export const sollicitantenPage = (req: Request, res: Response) => {
    const datum = req.params.datum;
    const type = 'sollicitanten';
    getSollicitantenlijstInput(req.params.marktId, req.params.datum).then(
        ({ ondernemers, aanmeldingen, voorkeuren, markt }) => {
            res.render('SollicitantenPage', { ondernemers, aanmeldingen, voorkeuren, markt, datum, type });
        },
        internalServerErrorPage(res),
    );
};

export const afmeldingenVasteplaatshoudersPage = (req: Request, res: Response, next: NextFunction) => {

    const datum = req.params.datum;
    const marktId = req.params.marktId;

    getToewijzingslijst(marktId, datum)
        .then( data => {

                const { ondernemers, aanmeldingen } = data;
                const vasteplaatshouders = ondernemers.filter(ondernemer => ondernemer.status === 'vpl');
                const vasteplaatshoudersAfwezig = vasteplaatshouders.filter( ondernemer => {
                    return !Indeling.isAanwezig(ondernemer, aanmeldingen, new Date(datum));
                });

                res.render('AfmeldingenVasteplaatshoudersPage', {
                    data,
                    vasteplaatshoudersAfgemeld: vasteplaatshoudersAfwezig,
                    markt: data.markt,
                    datum,
                });
            },
            internalServerErrorPage(res),
        )
        .catch(next);
};


export const voorrangslijstPage = (req: Request, res: Response, next: NextFunction) => {

    const datum = req.params.datum;

    getVoorrangslijstInput(req.params.marktId, req.params.datum).then( result => {

            let { ondernemers } = result;
            const { aanmeldingen, voorkeuren, markt, toewijzingen, aLijst, algemenevoorkeuren } = result;

            ondernemers = markt.kiesJeKraamFase === 'wenperiode' ? ondernemers.filter(ondernemer => ondernemer.status !== 'vpl') : ondernemers;
            const toewijzingenOptional = markt.kiesJeKraamFase === 'wenperiode' ? [] : toewijzingen;

            ondernemers.map(ondernemer => {
                ondernemer.voorkeur = algemenevoorkeuren.find(voorkeur => voorkeur.erkenningsNummer === ondernemer.erkenningsNummer);
                return ondernemer;
            });

            ondernemers = ondernemers.filter( ondernemer => {
                if (ondernemer.voorkeur) {
                    return !ondernemer.voorkeur.absentFrom && !ondernemer.voorkeur.absentUntil;
                } else {
                    return true;
                }
            });

            const type = markt.fase;

            res.render('VoorrangslijstPage', {
                ondernemers,
                aanmeldingen,
                voorkeuren,
                aLijst,
                markt,
                datum,
                type,
                toewijzingen: toewijzingenOptional,
                algemenevoorkeuren,
            });
        },
        internalServerErrorPage(res),
    ).catch(next);
};

export const voorrangslijstVolledigPage = (req: Request, res: Response, next: NextFunction) => {

    const datum = req.params.datum;

    getVoorrangslijstInput(req.params.marktId, req.params.datum).then( result => {

            const { ondernemers, aanmeldingen, voorkeuren, markt, aLijst, algemenevoorkeuren } = result;
            const ondernemersFiltered = ondernemers.filter(ondernemer => ondernemer.status !== 'vpl');
            // const toewijzingenOptional = markt.fase === 'wenperiode' ? [] : toewijzingen;

            const type = 'wenperiode';

            res.render('VoorrangslijstPage', {
                ondernemers: ondernemersFiltered,
                aanmeldingen,
                voorkeuren,
                aLijst,
                markt,
                datum,
                type,
                toewijzingen: [],
                algemenevoorkeuren,
            });
        },
        internalServerErrorPage(res),
    ).catch(next);
};
