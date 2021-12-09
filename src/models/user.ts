import { Schema, Types, model } from 'mongoose'
import type { IUser } from '../types/user'
import bcrypt from 'bcrypt'
import PasswordValidator from 'password-validator'
import validator from 'validator'
import jwt from 'jsonwebtoken'
import { ApiError } from '../types'
import * as Constants from '../utils/constants'

interface IUserDocument extends IUser {
    generateAuthToken: () => string
}

const schema = new Schema<IUserDocument>({
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
        type: String,
        required: true,
        validate(value: string) {
            if (!validator.isEmail(value)) {
                throw new ApiError(Constants.INVALID_EMAIL, 400)
            }
        },
    },
    password: { type: String, required: true, minlength: 7 },
    tokens: [{ type: String }],
    playerTeams: [{ type: Types.ObjectId }],
    managerTeams: [{ type: Types.ObjectId }],
    stats: [{ type: Types.ObjectId }],
})

const isValidPassword = (password: string): boolean => {
    const validateSchema = new PasswordValidator()

    // eslint-disable-next-line prettier/prettier
    validateSchema
        .is().min(7)
        .is().max(20)
        .has().letters()
        .has().digits()
        .has().symbols()

    return validateSchema.validate(password) as boolean
}

schema.pre('save', async function (next) {
    if (this.isModified('password')) {
        if (!isValidPassword(this.password)) {
            throw new ApiError(Constants.INVALID_PASSWORD, 400)
        }
        this.password = await bcrypt.hash(this.password, 10)
    }
    next()
})

schema.methods.toJSON = function () {
    const userObject: IUser = this.toObject()
    delete userObject.password
    delete userObject.tokens

    return userObject
}

schema.methods.generateAuthToken = async function () {
    const payload = {
        sub: this._id.toString(),
        iat: Date.now(),
    }

    try {
        const token = jwt.sign(payload, process.env.JWT_SECRET as string)
        this.tokens = this.tokens?.concat(token)
        await this.save()
        return token
    } catch (error) {
        throw new ApiError(Constants.UNABLE_TO_GENERATE_TOKEN, 500)
    }
}

const User = model<IUserDocument>('User', schema)

export type IUserModel = typeof User
export default User
