import randomstring from 'randomstring'
import { IUserModel, isValidPassword } from '../models/user'
import { CreateGuest, CreateUser } from '../types'
import { isUnusedObjectId } from './utils'
import { Types } from 'mongoose'

export const generateGuestData = async (
    guest: CreateGuest,
    userModel: IUserModel,
): Promise<CreateUser & { _id: Types.ObjectId }> => {
    const { _id: initialId, firstName, lastName, username: initialUsername } = guest

    const _id = (await isUnusedObjectId(userModel, initialId)) ? new Types.ObjectId(initialId) : new Types.ObjectId()

    let username = initialUsername ?? `guest${Date.now()}`
    let email = `${username}@theultmtapp.com`
    let previousUser = await userModel.findOne({ $or: [{ username }, { email }] })

    while (previousUser) {
        username = `guest${Date.now() + 10}`
        email = `${username}@theultmtapp.com`
        previousUser = await userModel.findOne({ $or: [{ username }, { email }] })
    }

    let password = ''
    while (!isValidPassword(password)) {
        password = randomstring.generate({ charset: 'a-zA-Z0-9!@#$%', length: 15 })
    }

    return {
        _id,
        firstName,
        lastName,
        username,
        email,
        password,
    }
}
