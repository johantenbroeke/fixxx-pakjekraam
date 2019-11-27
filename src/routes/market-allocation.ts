import { Request, Response } from 'express';
import {
    getAanmeldingen,
    getIndelingslijst,
    getToewijzingen,
    getMarktPaginas,
    getMarktGeografie,
    getMarktplaatsen,
    getPlaatsvoorkeuren,
    getAllBranches,
} from '../pakjekraam-api';
import {
    getMarkt,
} from '../makkelijkemarkt-api';
import { internalServerErrorPage } from '../express-util';
import { getOndernemersByMarkt } from '../model/ondernemer.functions';
import { getVoorkeurenByMarkt } from '../model/voorkeur.functions';

export const getIndelingslijstData = (marktId: string, marktDate: string) =>
    Promise.all([
        getOndernemersByMarkt(marktId),
        getAanmeldingen(marktId, marktDate),
        getMarkt(marktId),
        getMarktPaginas(marktId),
        getToewijzingen(marktId, marktDate),
        getMarktGeografie(marktId),
        getMarktplaatsen(marktId),
        getPlaatsvoorkeuren(marktId),
        getVoorkeurenByMarkt(marktId),
        getAllBranches(),
    ]).then( result => {
        const [
            ondernemers,
            aanmeldingen,
            markt,
            paginas,
            toewijzingen,
            geografie,
            marktplaatsen,
            plaatsvoorkeuren,
            voorkeuren,
            branches,
        ] = result;
        return {
            ondernemers,
            aanmeldingen,
            markt,
            paginas,
            toewijzingen,
            obstakels: geografie.obstakels || [],
            marktplaatsen,
            plaatsvoorkeuren,
            voorkeuren,
            branches
        };
    });


export const indelingslijstPage = (req: Request, res: Response) => {
    const { marktDate, marktId } = req.params;
    const type = 'concept-indelingslijst';

    Promise.all([
        getIndelingslijst(marktId, marktDate),
        getVoorkeurenByMarkt(marktId)
    ])
        .then((data: any) => {
            const [
                indelingslijst,
                voorkeuren,
            ] = data;
            // console.log(indelingslijst);
            // console.log(voorkeuren);
            indelingslijst.plaatsvoorkeuren = indelingslijst.voorkeuren;
            indelingslijst.voorkeuren = voorkeuren;
            // delete data.voorkeuren;
            return res.render('IndelingslijstPage.tsx', {
                ...indelingslijst,
                datum: marktDate,
                type
            });
        }, internalServerErrorPage(res));
};

export const marketAllocationPage = (req: Request, res: Response) => {

    const { marktDate, marktId } = req.params;
    getIndelingslijstData(marktId, marktDate).then(data => {
        res.render('IndelingslijstPage.tsx', { ...data, datum: marktDate, type:'wenperiode' });
    }, internalServerErrorPage(res));

};


export const indelingPage = (req: Request, res: Response) => {

    const { marktDate } = req.params;
    getIndelingslijstData(req.params.marktId, marktDate)
        .then(data => {
            res.render('IndelingslijstPage.tsx', { ...data, datum: marktDate, type: 'indeling' });
        }, internalServerErrorPage(res));


};
