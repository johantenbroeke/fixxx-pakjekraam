import { Request, Response, NextFunction } from 'express';
import { getIndelingslijstInput, getSollicitantenlijstInput, getVoorrangslijstInput, getToewijzingslijst } from '../pakjekraam-api';
import { internalServerErrorPage, HTTP_INTERNAL_SERVER_ERROR, httpErrorPage } from '../express-util';
import { Voorkeur } from '../model/voorkeur.model';


export const vasteplaatshoudersPage = (req: Request, res: Response) => {
    const datum = req.params.datum;
    const type = 'vasteplaatshouders';
    getIndelingslijstInput(req.params.marktId, datum).then(data => {
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

    const getToewijzingslijstPromise = getToewijzingslijst(marktId, datum);
    const getVoorkeuren = Voorkeur.findAll({ where: { marktId }, raw: true });

    Promise.all([
        getToewijzingslijstPromise,
        getVoorkeuren,
    ])
        .then(
            ([data, voorkeuren]) => {

                const vasteplaatshouders = data.ondernemers.filter(ondernemer => ondernemer.status === 'vpl');

                const vasteplaatshoudersByErkenningsNummer = vasteplaatshouders.map(ondernemer => ondernemer.erkenningsNummer);
                const afmeldingenVastplaatshouders = data.aanmeldingen.filter(aanmelding => {
                    return aanmelding.attending === false && vasteplaatshoudersByErkenningsNummer.includes(aanmelding.erkenningsNummer);
                });

                const vasteplaatshoudersAfgemeld =
                    (afmeldingenVastplaatshouders.length === 0) ? [] : afmeldingenVastplaatshouders.map(afmelding => {
                        const ondernemer = vasteplaatshouders.find(ondernemer => {
                            return ondernemer.erkenningsNummer === afmelding.erkenningsNummer;
                        });
                        return ondernemer;
                    });

                const vasteplaatshoudersAfgemeldLangerePeriode = vasteplaatshouders.filter(ondernemer => {

                    const voorkeurOndernemer = voorkeuren.find(voorkeur => voorkeur.erkenningsNummer === ondernemer.erkenningsNummer);

                    if (voorkeurOndernemer !== undefined ) {
                        if ( Boolean(voorkeurOndernemer.absentFrom) && Boolean(voorkeurOndernemer.absentUntil) ) {
                            const absentFrom = new Date(voorkeurOndernemer.absentFrom);
                            const absentUntil = new Date(voorkeurOndernemer.absentUntil);
                            const marktDate = new Date(datum);
                            if (marktDate >= absentFrom && marktDate <= absentUntil) {
                                console.log(`${ondernemer.description} is afwezig`);
                                return true;
                            } else {
                                return false;
                            }
                        } else {
                            return false;
                        }
                    } else {
                        return false;
                    }
                });

                const alleVastePlaatshoudersAfgemeld = vasteplaatshoudersAfgemeld.concat(vasteplaatshoudersAfgemeldLangerePeriode);

                res.render('AfmeldingenVasteplaatshoudersPage', {
                    data,
                    vasteplaatshoudersAfgemeld: alleVastePlaatshoudersAfgemeld,
                    markt: data.markt,
                    datum,
                });
            },
            err => httpErrorPage(res, HTTP_INTERNAL_SERVER_ERROR)(err),
        )
        .catch(next);
};


export const voorrangslijstPage = (req: Request, res: Response, next: NextFunction) => {
    const datum = req.params.datum;
    const type = req.query.type === 'wenperiode' ? 'wenperiode' : 'voorrangslijst';
    getVoorrangslijstInput(req.params.marktId, req.params.datum).then(
        ({ ondernemers, aanmeldingen, voorkeuren, markt, toewijzingen, aLijst, algemenevoorkeuren }) => {
            const ondernemersFiltered =
                type === 'wenperiode' ? ondernemers.filter(ondernemer => ondernemer.status !== 'vpl') : ondernemers;
            const toewijzingenOptional = type === 'wenperiode' ? [] : toewijzingen;
            res.render('VoorrangslijstPage', {
                ondernemers: ondernemersFiltered,
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
        next,
    ).catch(next);
};
