import { IUserModel } from '../models/user'
import type { IUser } from '../types/user'

export default class UserServices {
    userModel: IUserModel

    constructor(userModel: IUserModel) {
        this.userModel = userModel
    }

    signUp = async (user: IUser): Promise<IUser> => {
        console.log('trying create')
        const userObject = await this.userModel.create(user)
        console.log('trying save')
        await userObject.save()
        console.log('after save')
        return userObject
    }

    fetchUser = async (id: string): Promise<IUser> => {
        const user = await this.userModel.findById(id)
        if (user == null) {
            throw new Error('User not found')
        }
        return user
    }
}
