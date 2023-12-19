import { Types } from 'mongoose'
import { EmbeddedUser } from '.'

export interface CreateTeam {
    place: string
    name: string
    teamname: string
    seasonStart: string
    seasonEnd: string
    designation?: Types.ObjectId
}

export interface EmbeddedTeam {
    _id: Types.ObjectId
    place: string
    name: string
    teamname: string
    seasonStart: Date
    seasonEnd: Date
    verified: boolean
    designation?: Types.ObjectId
}

export interface ITeam extends EmbeddedTeam {
    managers: EmbeddedUser[]
    players: EmbeddedUser[]
    seasonNumber: number
    continuationId: Types.ObjectId
    rosterOpen: boolean
    requests: Types.ObjectId[]
    verified: boolean
}
