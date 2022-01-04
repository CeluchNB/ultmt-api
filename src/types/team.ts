import { Types } from 'mongoose'
import { EmbeddedUser } from '.'

export interface ITeam {
    _id: Types.ObjectId
    place: string
    name: string
    managers: EmbeddedUser[]
    players: EmbeddedUser[]
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
