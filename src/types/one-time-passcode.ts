import { Types } from 'mongoose'

export enum OTPReason {
    PasswordRecovery = 'passwordrecovery',
    TeamJoin = 'teamjoin',
}

export interface IOneTimePasscode {
    _id: Types.ObjectId
    passcode: string
    createdAt: Date
    expiresAt: Date
    creator: Types.ObjectId
    reason: string
    isExpired: () => boolean
}
