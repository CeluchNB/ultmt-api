import { Schema, SchemaTypes, model } from 'mongoose'
import IVerification, { SourceType } from '../types/verification'
import { Status } from '../types/roster-request'

const schema = new Schema<IVerification>({
    sourceType: { type: String, enum: Object.values(SourceType), required: true },
    sourceId: { type: SchemaTypes.ObjectId, required: true },
    status: { type: String, enum: Object.values(Status), required: true },
    creator: {
        type: {
            _id: SchemaTypes.ObjectId,
            firstName: String,
            lastName: String,
            username: String,
        },
        required: true,
    },
})

const Verification = model<IVerification>('Verification', schema)
export type IVerificationModel = typeof Verification
export default Verification
