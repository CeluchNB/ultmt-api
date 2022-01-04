import { Types } from 'mongoose'

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
    playerTeams: Types.ObjectId[]
    managerTeams: Types.ObjectId[]
    stats: Types.ObjectId[]
    requests: Types.ObjectId[]
    openToRequests: boolean
    generateAuthToken(): string
}
