import { Types, Document } from 'mongoose'
import { EmbeddedTeam } from '.'

export interface CreateUser {
    firstName: string
    lastName: string
    email: string
    username: string
    password?: string
}

export interface IUser extends CreateUser, Document {
    private: boolean
    tokens?: string[]
    playerTeams: EmbeddedTeam[]
    managerTeams: EmbeddedTeam[]
    archiveTeams: EmbeddedTeam[]
    stats: Types.ObjectId[]
    requests: Types.ObjectId[]
    openToRequests: boolean
    generateAuthToken(): string
}

export interface EmbeddedUser {
    _id: Types.ObjectId
    firstName: string
    lastName: string
    username: string
}
