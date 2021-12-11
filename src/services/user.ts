import { IUserModel } from '../models/user'
import { ApiError, IUser, IUserDocument } from '../types'
import * as Constants from '../utils/constants'

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

    login = async (email: string): Promise<string> => {
        const user = await this.userModel.findOne({ email })
        const token = await user?.generateAuthToken()

        if (token) {
            return token
        } else {
            throw new ApiError(Constants.UNABLE_TO_GENERATE_TOKEN, 500)
        }
    }
}
