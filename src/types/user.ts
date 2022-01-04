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
    tokens?: string[]
    playerTeams: EmbeddedTeam[]
    managerTeams: EmbeddedTeam[]
    stats: Types.ObjectId[]
    requests: Types.ObjectId[]
    openToRequests: boolean
    generateAuthToken(): string
}
