import { Types } from 'mongoose'
import { EmbeddedTeam, ITeam } from '.'

export interface CreateUser {
    firstName: string
    lastName: string
    email: string
    username: string
    password?: string
}

export interface Tokens {
    access: string
    refresh: string
}

export interface IUser extends CreateUser {
    _id: Types.ObjectId
    private: boolean
    playerTeams: EmbeddedTeam[]
    managerTeams: EmbeddedTeam[]
    archiveTeams: EmbeddedTeam[]
    requests: Types.ObjectId[]
    openToRequests: boolean
    verified: boolean
    generateAuthToken: () => string
    generateRefreshToken: () => string
    isModified: (property: string) => boolean
}

export interface EmbeddedUser {
    _id: Types.ObjectId
    firstName: string
    lastName: string
    username: string
    verified: boolean
}

export type UserProfile = { user: IUser; fullManagerTeams: ITeam[] }
