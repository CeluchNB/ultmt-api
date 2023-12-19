import ITeamDesignation from '../types/team-designation'
import { model, Schema } from 'mongoose'

const schema = new Schema<ITeamDesignation>({
    description: { type: String, required: true },
    abbreviation: { type: String, required: true, maxlength: 3, minlength: 1 },
})

const TeamDesignation = model<ITeamDesignation>('TeamDesignation', schema)

export type IRosterRequestModel = typeof TeamDesignation
export default TeamDesignation
