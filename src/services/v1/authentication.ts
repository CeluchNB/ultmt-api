import * as Constants from '../../utils/constants'
import { IUserModel } from '../../models/user'
import { ITeamModel } from '../../models/team'
import { ApiError, IUser, RedisClientType, Tokens } from '../../types'
import UltmtValidator from '../../utils/ultmt-validator'

export default class AuthenticationServices {
    userModel: IUserModel
    teamModel: ITeamModel
    redisClient: RedisClientType

    constructor(userModel: IUserModel, teamModel: ITeamModel, redisClient: RedisClientType) {
        this.userModel = userModel
        this.teamModel = teamModel
        this.redisClient = redisClient
    }

    /**
     * Method to generate an authentication token for a user
     * Actual email/password check occurs in passport.js
     * @param email email to login with
     * @returns the authentication token
     */
    login = async (id: string): Promise<Tokens> => {
        const user = await this.userModel.findById(id)
        const access = await user?.generateAuthToken()
        const refresh = await user?.generateRefreshToken()

        if (access && refresh) {
            return { access, refresh }
        } else {
            throw new ApiError(Constants.UNABLE_TO_GENERATE_TOKEN, 500)
        }
    }

    /**
     * Method to logout
     * @param email Email of user to logout
     * @param jwt authentication token to blacklist
     */
    logout = async (id: string, accessToken: string, refreshToken?: string) => {
        const user = await this.userModel.findById(id)
        if (!user) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }
        // TODO: Add access and refresh token to blacklist
        await this.redisClient.setEx(accessToken, 60 * 60 * 12, '1')
        if (refreshToken) {
            await this.redisClient.setEx(refreshToken, 60 * 60 * 24 * 90, '1')
        }
        await user.save()
    }

    /**
     * Method to check if user is manager of a team
     * @param userId id of manager
     * @param teamId id of team
     */
    authenticateManager = async (userId: string, teamId: string): Promise<IUser> => {
        const user = await this.userModel.findById(userId)
        if (!user) {
            throw new ApiError(Constants.UNAUTHORIZED_MANAGER, 401)
        }
        await new UltmtValidator(this.userModel, this.teamModel).userIsManager(userId, teamId).test()

        return user
    }
}
