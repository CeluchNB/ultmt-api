import { Types, Document } from 'mongoose'

export interface IUser {
    firstName: string
    lastName: string
    email: string
    password?: string
}

export interface IUserDocument extends IUser, Document {
    tokens?: string[]
    playerTeams?: Types.ObjectId[]
    managerTeams?: Types.ObjectId[]
    stats?: Types.ObjectId[]
    generateAuthToken(): string
}
