import { Schema, SchemaTypes, model } from 'mongoose'
import IVerificationRequest, { SourceType } from '../types/verification-request'
import { Status } from '../types/roster-request'

const schema = new Schema<IVerificationRequest>(
    {
        sourceType: { type: String, enum: Object.values(SourceType), required: true },
        sourceId: { type: SchemaTypes.ObjectId, required: true },
        status: { type: String, enum: Object.values(Status), required: true, default: 'pending' },
        creator: {
            type: {
                _id: SchemaTypes.ObjectId,
                firstName: String,
                lastName: String,
                username: String,
            },
            required: true,
        },
    },
    { timestamps: true },
)

const VerificationRequest = model<IVerificationRequest>('VerificationRequest', schema)
export type IVerificationRequestModel = typeof VerificationRequest
export default VerificationRequest
