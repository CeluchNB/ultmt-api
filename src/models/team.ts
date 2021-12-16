import { ITeamDocument } from '../types'
import { model, Schema, Types } from 'mongoose'

const schema = new Schema<ITeamDocument>({
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
    requestingPlayers: [{ type: Types.ObjectId }],
    requestedPlayers: [{ type: Types.ObjectId }],
    games: [{ type: Types.ObjectId }],
})

schema.virtual('managerArray', {
    ref: 'User',
    localField: 'managers',
    foreignField: '_id',
    justOne: false,
})

const Team = model<ITeamDocument>('Team', schema)

export default Team
