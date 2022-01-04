import { Types } from 'mongoose'

export interface ITeam {
    _id: Types.ObjectId
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

export interface EmbeddedTeam {
    _id: Types.ObjectId
    place: string
    name: string
    seasonStart: Date
    seasonEnd: Date
}
