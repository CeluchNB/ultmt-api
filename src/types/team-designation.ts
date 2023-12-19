import { Types } from 'mongoose'

export interface TeamDesignationData {
    description: string
    abbreviation: string
}

interface ITeamDesignation extends TeamDesignationData {
    _id: Types.ObjectId
}

export default ITeamDesignation
