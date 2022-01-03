import { ITeamDocument } from '../types'
import { model, Schema, SchemaTypes, Types } from 'mongoose'

const opts = { toJSON: { virtuals: true } }

export const schema = new Schema<ITeamDocument>(
    {
        place: { type: String, required: true },
        name: { type: String, required: true },
        managers: [{ type: Types.ObjectId }],
        players: [{ type: Types.ObjectId }],
        seasonStart: {
            type: Date,
            required: true,
        },
        seasonEnd: {
            type: Date,
            required: true,
        },
        seasonNumber: {
            type: Number,
            required: true,
            default: 1,
        },
        continuationId: {
            type: SchemaTypes.ObjectId,
            required: true,
        },
        rosterOpen: {
            type: Boolean,
            required: true,
            default: false,
        },
        requests: [{ type: Types.ObjectId }],
        games: [{ type: Types.ObjectId }],
    },
    opts,
)

schema.virtual('managerArray', {
    ref: 'User',
    localField: 'managers',
    foreignField: '_id',
})

schema.virtual('playerArray', {
    ref: 'User',
    localField: 'players',
    foreignField: '_id',
})

const Team = model<ITeamDocument>('Team', schema)

export type ITeamModel = typeof Team
export default Team
