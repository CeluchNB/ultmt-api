import { Types } from 'mongoose'
import { EmbeddedUser } from './user'

export enum SourceType {
    TEAM = 'team',
    USER = 'user',
    TOURNAMENT = 'tournament',
}

interface IVerification {
    _id: Types.ObjectId
    sourceType: string
    sourceId: Types.ObjectId
    creator: EmbeddedUser
    status: string
}

export default IVerification
