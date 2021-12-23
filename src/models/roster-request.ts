import { Initiator, Status, IRosterRequestDocument } from '../types'
import { model, Schema, SchemaTypes } from 'mongoose'

const schema = new Schema<IRosterRequestDocument>({
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

const RosterRequest = model<IRosterRequestDocument>('RosterRequest', schema)

export type IRosterRequestModel = typeof RosterRequest
export default RosterRequest
