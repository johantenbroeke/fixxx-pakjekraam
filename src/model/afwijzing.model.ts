import { Model } from 'sequelize';
import { IAfwijzing, BrancheId } from '../markt.model';

export class Afwijzing extends Model<IAfwijzing> {
    public id!: number;
    public marktId!: string;
    public marktDate!: string;
    public reasonCode!: number;
    public erkenningsNummer!: string;
    public plaatsvoorkeuren!: string[];
    public anywhere!: boolean;
    public minimum!: number;
    public maximum!: number;
    public bak!: boolean;
    public eigenMaterieel!: boolean;
    public brancheId!: string;
}
