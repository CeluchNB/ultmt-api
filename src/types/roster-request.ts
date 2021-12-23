import { Types, Document } from 'mongoose'

export enum Initiator {
    Player,
    Team,
}

export enum Status {
    Pending,
    Approved,
    Denied,
}

export interface IRosterRequest {
    team: Types.ObjectId
    user: Types.ObjectId
    requestSource: string
    status: string
}

export interface IRosterRequestDocument extends IRosterRequest, Document {}
