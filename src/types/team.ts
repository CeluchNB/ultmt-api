import { Types, Document } from 'mongoose'
import { IUserDocument } from '.'

export interface ITeam {
    place: string
    name: string
    managers: Types.ObjectId[]
    players: Types.ObjectId[]
    seasonStart: Date
    seasonEnd: Date
    rosterOpen: boolean
    requestingPlayers: Types.ObjectId[]
    requestedPlayers: Types.ObjectId[]
    games: Types.ObjectId[]
}

export interface ITeamDocument extends ITeam, Document {
    managerArray: IUserDocument[]
    playerArray: IUserDocument[]
    requestingPlayerArray: IUserDocument[]
    requestedPlayerArray: IUserDocument[]
}
