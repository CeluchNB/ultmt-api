import { Types } from 'mongoose'

export enum OTPReason {
    PasswordRecovery = 'passwordrecovery',
    TeamJoin = 'teamjoin',
    GameJoin = 'gamejoin',
}

export interface IOneTimePasscode {
    _id: Types.ObjectId
    passcode: string
    createdAt: Date
    expiresAt: Date
    creator: Types.ObjectId
    reason: string
    team: Types.ObjectId
    isExpired: () => boolean
}
