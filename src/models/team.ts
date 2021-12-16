import { ITeamDocument } from '../types'
import { model, Schema, Types } from 'mongoose'

const opts = { toJSON: { virtuals: true } }

const schema = new Schema<ITeamDocument>(
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
        rosterOpen: {
            type: Boolean,
            required: true,
            default: false,
        },
        requestingPlayers: [{ type: Types.ObjectId }],
        requestedPlayers: [{ type: Types.ObjectId }],
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

schema.virtual('requestingPlayerArray', {
    ref: 'User',
    localField: 'requestingPlayers',
    foreignField: '_id',
})

schema.virtual('requestedPlayerArray', {
    ref: 'User',
    localField: 'requestedPlayers',
    foreignField: '_id',
})

const Team = model<ITeamDocument>('Team', schema)

export default Team
