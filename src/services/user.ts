import { IUserModel } from '../models/user'
import { IUser, IUserDocument, ApiError } from '../types'
import * as Constants from '../utils/constants'

export default class UserServices {
    userModel: IUserModel

    constructor(userModel: IUserModel) {
        this.userModel = userModel
    }

    signUp = async (user: IUser): Promise<{ user: IUserDocument; token: string }> => {
        let userObject
        let token: string
        try {
            userObject = await this.userModel.create(user)
            await userObject.save()

            token = await userObject.generateAuthToken()
        } catch (error) {
            throw new ApiError(Constants.UNABLE_TO_CREATE_USER, 400)
        }
        return { user: userObject, token }
    }
}
