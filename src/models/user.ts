import { Schema, Types, model } from 'mongoose'
import type { IUser } from '../types/user'
import bcrypt from 'bcrypt'
import PasswordValidator from 'password-validator'
import validator from 'validator'
import jwt from 'jsonwebtoken'
import { ApiError } from '../types'
import * as Constants from '../utils/constants'

const schema = new Schema<IUser>({
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
        type: String,
        required: true,
        unique: true,
        validate(value: string) {
            if (!validator.isEmail(value)) {
                throw new ApiError(Constants.INVALID_EMAIL, 400)
            }
        },
    },
    username: {
        type: String,
        required: true,
        unique: true,
        validate(value: string) {
            if (!validator.isAlphanumeric(value)) {
                throw new ApiError(Constants.INVALID_USERNAME, 400)
            }
        },
    },
    password: { type: String, required: true },
    private: { type: Boolean, required: true, default: false },
    tokens: [{ type: String }],
    requests: [{ type: Types.ObjectId }],
    playerTeams: [{ type: Types.ObjectId }],
    managerTeams: [{ type: Types.ObjectId }],
    stats: [{ type: Types.ObjectId }],
    openToRequests: {
        type: Boolean,
        required: true,
        default: false,
    },
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
    if (this.password !== undefined && this.isModified('password')) {
        if (!isValidPassword(this.password)) {
            next(new ApiError(Constants.INVALID_PASSWORD, 400))
        }
        this.password = await bcrypt.hash(this.password, 10)
    }
    next()
})

schema.methods.toJSON = function () {
    const userObject = this.toObject()
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

const User = model<IUser>('User', schema)

export type IUserModel = typeof User
export default User
