import { Status, IDetailedClaimGuestRequest } from '../types'
import { model, Schema, SchemaTypes } from 'mongoose'

const opts = { toJSON: { virtuals: true } }

const schema = new Schema<IDetailedClaimGuestRequest>(
    {
        guestId: { ref: 'User', type: SchemaTypes.ObjectId, required: true },
        userId: { ref: 'User', type: SchemaTypes.ObjectId, required: true },
        status: {
            type: String,
            enum: Object.values(Status),
            required: true,
            default: Status.Pending,
        },
    },
    opts,
)

schema.virtual('guest', {
    ref: 'User',
    localField: 'guestId',
    foreignField: '_id',
    justOne: true,
})

schema.virtual('user', {
    ref: 'User',
    localField: 'userId',
    foreignField: '_id',
    justOne: true,
})

const ClaimGuestRequest = model<IDetailedClaimGuestRequest>('ClaimGuestRequest', schema)

export type IClaimGuestRequestModel = typeof ClaimGuestRequest
export default ClaimGuestRequest
