import { Initiator, Status, IDetailedRosterRequest } from '../types'
import { model, Schema, SchemaTypes } from 'mongoose'

const opts = { toJSON: { virtuals: true } }

const schema = new Schema<IDetailedRosterRequest>(
    {
        team: { ref: 'Team', type: SchemaTypes.ObjectId, required: true },
        user: { ref: 'User', type: SchemaTypes.ObjectId, required: true },
        requestSource: {
            type: String,
            enum: Object.values(Initiator),
            required: true,
        },
        status: {
            type: String,
            enum: Object.values(Status),
            required: true,
        },
    },
    opts,
)

schema.virtual('teamDetails', {
    ref: 'Team',
    localField: 'team',
    foreignField: '_id',
    justOne: true,
})

schema.virtual('userDetails', {
    ref: 'User',
    localField: 'user',
    foreignField: '_id',
    justOne: true,
})

const RosterRequest = model<IDetailedRosterRequest>('RosterRequest', schema)

export type IRosterRequestModel = typeof RosterRequest
export default RosterRequest
