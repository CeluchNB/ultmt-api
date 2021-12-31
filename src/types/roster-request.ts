import { Types, Document } from 'mongoose'

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
    team: Types.ObjectId
    user: Types.ObjectId
    requestSource: string
    status: string
}

export interface IRosterRequestDocument extends IRosterRequest, Document {}
