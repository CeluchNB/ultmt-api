import { IUserModel } from '../models/user'
import { IUser, IUserDocument } from '../types'

export default class UserServices {
    userModel: IUserModel

    constructor(userModel: IUserModel) {
        this.userModel = userModel
    }

    signUp = async (user: IUser): Promise<{ user: IUserDocument; token: string }> => {
        const userObject = await this.userModel.create(user)
        const token = await userObject.generateAuthToken()

        return { user: userObject, token }
    }
}
