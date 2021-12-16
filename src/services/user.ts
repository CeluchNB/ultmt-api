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

    logout = async (email: string, jwt: string) => {
        const user = await this.userModel.findOne({ email })
        if (!user) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }
        user.tokens = user?.tokens?.filter((token) => token !== jwt)
        await user.save()
    }

    logoutAll = async (email: string) => {
        const user = await this.userModel.findOne({ email })
        if (!user) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }
        user.tokens = []
        await user.save()
    }

    getUser = async (id: string): Promise<IUserDocument> => {
        const user = await this.userModel.findById(id)

        if (!user) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        if (user.private) {
            user.stats = undefined
            user.playerTeams = undefined
            user.managerTeams = undefined
        }
        user.requestedTeams = undefined
        user.requestingTeams = undefined

        return user
    }

    deleteUser = async (id: string) => {
        await this.userModel.deleteOne({ _id: id })
    }
}
