import { Types } from 'mongoose'
import { EmbeddedTeam, EmbeddedUser } from '.'

export enum Initiator {
    Player = 'player',
    Team = 'team',
}

export enum Status {
    Pending = 'pending',
    Approved = 'approved',
    Denied = 'denied',
}

export interface IRosterRequest {
    _id: Types.ObjectId
    team: Types.ObjectId
    user: Types.ObjectId
    requestSource: string
    status: string
}

export interface IDetailedRosterRequest extends IRosterRequest {
    teamDetails: EmbeddedTeam
    userDetails: EmbeddedUser
}
