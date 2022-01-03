import { Types, Document } from 'mongoose'
import { IRosterRequestDocument, IUserDocument } from '.'

export interface ITeam {
    place: string
    name: string
    managers: Types.ObjectId[]
    players: Types.ObjectId[]
    seasonStart: Date
    seasonEnd: Date
    seasonNumber: number
    continuationId: Types.ObjectId
    rosterOpen: boolean
    requests: Types.ObjectId[]
    games: Types.ObjectId[]
}

export interface ITeamDocument extends ITeam, Document {
    managerArray: IUserDocument[]
    playerArray: IUserDocument[]
    requestsArray: IRosterRequestDocument[]
}
