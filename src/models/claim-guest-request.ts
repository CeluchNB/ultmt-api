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
        },
    },
    opts,
)

schema.virtual('guest', {
    ref: 'User',
    localField: 'guest',
    foreignField: '_id',
    justOne: true,
})

schema.virtual('user', {
    ref: 'User',
    localField: 'user',
    foreignField: '_id',
    justOne: true,
})

const ClaimGuestRequest = model<IDetailedClaimGuestRequest>('RosterRequest', schema)

export type IRosterRequestModel = typeof ClaimGuestRequest
export default ClaimGuestRequest
