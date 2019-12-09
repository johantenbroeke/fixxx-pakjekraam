import { Model } from 'sequelize';
import { IToewijzing } from '../markt.model';

export class Allocation extends Model<IToewijzing, IToewijzing> {
    public id!: number;
    public marktId!: string;
    public marktDate!: string;
    public plaatsId!: string;
    public erkenningsNummer!: string;
    public plaatsvoorkeuren!: string[];
    public anywhere!: boolean;
    public minimum!: number;
    public maximum!: number;
    public bak!: boolean;
    public brancheId!: string;
}
