import { ITeam } from '../types'
import { model, Schema, SchemaTypes, Types } from 'mongoose'
import validator from 'validator'

export const schema = new Schema<ITeam>({
    place: { type: String, required: true },
    name: { type: String, required: true },
    teamname: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: function (v: string) {
                return validator.isAlphanumeric(v)
            },
        },
    },
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
})

schema.index({ place: 'text', name: 'text' })

const Team = model<ITeam>('Team', schema)

export type ITeamModel = typeof Team
export default Team
