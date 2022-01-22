import { ITeam } from '../types'
import { model, Schema, SchemaTypes, Types } from 'mongoose'

const opts = { toJSON: { virtuals: true } }

export const schema = new Schema<ITeam>(
    {
        place: { type: String, required: true },
        name: { type: String, required: true },
        managers: [
            {
                _id: Types.ObjectId,
                firstName: String,
                lastName: String,
                username: String,
            },
        ],
        players: [
            {
                _id: Types.ObjectId,
                firstName: String,
                lastName: String,
                username: String,
            },
        ],
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

schema.index({ place: 'text', name: 'text' })

const Team = model<ITeam>('Team', schema)

export type ITeamModel = typeof Team
export default Team
