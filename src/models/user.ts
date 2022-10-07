import { Schema, Types, model, Document } from 'mongoose'
import type { IUser } from '../types/user'
import bcrypt from 'bcryptjs'
import PasswordValidator from 'password-validator'
import validator from 'validator'
import jwt from 'jsonwebtoken'
import { ApiError } from '../types'
import * as Constants from '../utils/constants'

const schema = new Schema<IUser>({
    firstName: { type: String, required: true, trim: true, maxLength: [20, Constants.NAME_TOO_LONG] },
    lastName: { type: String, required: true, trim: true, maxLength: [30, Constants.NAME_TOO_LONG] },
    email: {
        type: String,
        required: true,
        unique: true,
        validate: [
            {
                validator: function (value: string) {
                    if (!validator.isEmail(value)) {
                        return false
                    }
                    return true
                },
                message: Constants.INVALID_EMAIL,
            },
            {
                validator: async function (this: Document, value: string) {
                    if (!this.isNew) {
                        return true
                    }
                    const count = await model('User').count({ email: value })
                    return count < 1
                },
                message: Constants.DUPLICATE_EMAIL,
            },
        ],
    },
    username: {
        type: String,
        required: true,
        unique: true,
        minLength: 2,
        maxLength: 20,
        validate: [
            {
                validator: function (value: string) {
                    if (!validator.isAlphanumeric(value)) {
                        return false
                    }
                    return true
                },
                message: Constants.INVALID_USERNAME,
            },
            {
                validator: async function (this: Document, value: string) {
                    if (!this.isNew) {
                        return true
                    }
                    const count = await model('User').count({ username: value })
                    return count < 1
                },
                message: Constants.DUPLICATE_USERNAME,
            },
        ],
    },
    password: { type: String, required: true },
    private: { type: Boolean, required: true, default: false },
    requests: [{ type: Types.ObjectId }],
    playerTeams: [
        {
            _id: Types.ObjectId,
            place: String,
            name: String,
            teamname: String,
            seasonStart: Date,
            seasonEnd: Date,
        },
    ],
    managerTeams: [
        {
            _id: Types.ObjectId,
            place: String,
            name: String,
            teamname: String,
            seasonStart: Date,
            seasonEnd: Date,
        },
    ],
    archiveTeams: [
        {
            _id: Types.ObjectId,
            place: String,
            name: String,
            teamname: String,
            seasonStart: Date,
            seasonEnd: Date,
        },
    ],
    stats: [{ type: Types.ObjectId }],
    openToRequests: {
        type: Boolean,
        required: true,
        default: true,
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

schema.pre('save', async function (this: IUser, next) {
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

    return userObject
}

schema.methods.generateAuthToken = async function () {
    try {
        const token = jwt.sign({}, process.env.JWT_SECRET as string, {
            subject: this._id.toString(),
            expiresIn: '12 hours',
        })
        return token
    } catch (error) {
        throw new ApiError(Constants.UNABLE_TO_GENERATE_TOKEN, 500)
    }
}

schema.index({ firstName: 'text', lastName: 'text', username: 'text' })

const User = model<IUser>('User', schema)

export type IUserModel = typeof User
export default User
