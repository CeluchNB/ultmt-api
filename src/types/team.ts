import { Types, Document } from 'mongoose'

export interface ITeamUser {
    userId: Types.ObjectId
    firstName: string
    lastName: string
}

export interface ITeam {
    place: string
    name: string
    managers: Types.ObjectId[]
    players: Types.ObjectId[]
    seasonStart: Date
    seasonEnd: Date
}

export interface ITeamDocument extends ITeam, Document {
    requestingPlayers: Types.ObjectId[]
    requestedPlayers: Types.ObjectId[]
    games: Types.ObjectId[]
}
