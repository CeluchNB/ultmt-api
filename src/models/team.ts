import * as Constants from '../utils/constants'
import { ITeam } from '../types'
import { Document, model, Schema, SchemaTypes } from 'mongoose'
import validator from 'validator'

export const schema = new Schema<ITeam>({
    place: { type: String, required: true, maxLength: 20 },
    name: { type: String, required: true, maxLength: 20 },
    teamname: {
        type: String,
        required: true,
        unique: true,
        minLength: 2,
        maxLength: 20,
        validate: [
            {
                validator: function (v: string) {
                    return validator.isAlphanumeric(v)
                },
                message: Constants.NON_ALPHANUM_TEAM_NAME,
            },
            {
                validator: async function (this: Document, value: string) {
                    if (!this.isNew) {
                        return true
                    }
                    const count = await model('Team').count({ teamname: value })
                    return count < 1
                },
                message: Constants.DUPLICATE_TEAM_NAME,
            },
        ],
    },
    managers: [
        {
            _id: SchemaTypes.ObjectId,
            firstName: String,
            lastName: String,
            username: String,
        },
    ],
    players: [
        {
            _id: SchemaTypes.ObjectId,
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
    requests: [{ type: SchemaTypes.ObjectId }],
    games: [{ type: SchemaTypes.ObjectId }],
})

schema.index({ place: 'text', name: 'text', teamname: 'text' })

const Team = model<ITeam>('Team', schema)

export type ITeamModel = typeof Team
export default Team
