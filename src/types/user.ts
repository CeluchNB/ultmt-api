import { Types, Document } from 'mongoose'

export interface IUser {
    firstName: string
    lastName: string
    email: string
    username: string
    password?: string
}

export interface IUserDocument extends IUser, Document {
    private: boolean
    tokens?: string[]
    playerTeams?: Types.ObjectId[]
    managerTeams?: Types.ObjectId[]
    stats?: Types.ObjectId[]
    requestsFromTeams?: Types.ObjectId[]
    requestsToTeams?: Types.ObjectId[]
    generateAuthToken(): string
}
