import { Types } from 'mongoose'
import { EmbeddedTeam, EmbeddedUser, Status } from '.'

export interface IClaimGuestRequest {
    _id: Types.ObjectId
    guestId: Types.ObjectId
    userId: Types.ObjectId
    teamId: Types.ObjectId
    status: Status
}

export interface IDetailedClaimGuestRequest extends IClaimGuestRequest {
    guest: EmbeddedUser
    user: EmbeddedUser
    team: EmbeddedTeam
}
