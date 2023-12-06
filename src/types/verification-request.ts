import { Types } from 'mongoose'
import { EmbeddedUser } from './user'

export enum SourceType {
    TEAM = 'team',
    USER = 'user',
    TOURNAMENT = 'tournament',
}

interface IVerificationRequest {
    _id: Types.ObjectId
    sourceType: string
    sourceId: Types.ObjectId
    creator: EmbeddedUser
    status: string
}

export default IVerificationRequest
