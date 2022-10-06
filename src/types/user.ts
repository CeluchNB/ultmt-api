import { Types } from 'mongoose'
import { EmbeddedTeam } from '.'

export interface CreateUser {
    firstName: string
    lastName: string
    email: string
    username: string
    password?: string
}

export interface IUser extends CreateUser {
    _id: Types.ObjectId
    private: boolean
    playerTeams: EmbeddedTeam[]
    managerTeams: EmbeddedTeam[]
    archiveTeams: EmbeddedTeam[]
    stats: Types.ObjectId[]
    requests: Types.ObjectId[]
    openToRequests: boolean
    generateAuthToken: () => string
    isModified: (property: string) => boolean
}

export interface EmbeddedUser {
    _id: Types.ObjectId
    firstName: string
    lastName: string
    username: string
}
