import { Types } from 'mongoose'
import { EmbeddedUser } from '.'

export interface CreateTeam {
    place: string
    name: string
    teamname: string
    seasonStart: string
    seasonEnd: string
}

export interface ITeam {
    _id: Types.ObjectId
    place: string
    name: string
    teamname: string
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
    teamname: string
    seasonStart: Date
    seasonEnd: Date
}
