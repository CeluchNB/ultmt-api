import { Types } from 'mongoose'

export interface IUser {
    firstName: string
    lastName: string
    email: string
    password: string
    tokens: string[]
    playerTeams: Types.ObjectId[]
    managerTeams: Types.ObjectId[]
    stats: Types.ObjectId[]
}
