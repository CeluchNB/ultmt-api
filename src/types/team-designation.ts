import { Types } from 'mongoose'

interface ITeamDesignation {
    _id: Types.ObjectId
    description: string
    abbreviation: string
}

export default ITeamDesignation
