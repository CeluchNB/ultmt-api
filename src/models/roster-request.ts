import { Initiator, Status, IRosterRequest } from '../types'
import { model, Schema, SchemaTypes } from 'mongoose'

const schema = new Schema<IRosterRequest>({
    team: { type: SchemaTypes.ObjectId, required: true },
    user: { type: SchemaTypes.ObjectId, required: true },
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
})

const RosterRequest = model<IRosterRequest>('RosterRequest', schema)

export type IRosterRequestModel = typeof RosterRequest
export default RosterRequest
