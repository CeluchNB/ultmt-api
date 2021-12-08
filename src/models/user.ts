import { Schema, Types, model } from 'mongoose'
import type { IUser } from '../types/user'

const schema = new Schema<IUser>({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    tokens: [{ type: String }],
    playerTeams: [{ type: Types.ObjectId }],
    managerTeams: [{ type: Types.ObjectId }],
    stats: [{ type: Types.ObjectId }],
})

const User = model<IUser>('User', schema)

export type IUserModel = typeof User
export default User
