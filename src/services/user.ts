import Team from '../models/team'
import User, { IUserModel } from '../models/user'
import { ApiError, IUser, IUserDocument } from '../types'
import * as Constants from '../utils/constants'
import { Types } from 'mongoose'

export default class UserServices {
    userModel: IUserModel

    constructor(userModel: IUserModel) {
        this.userModel = userModel
    }

    /**
     * Method to sign a user up
     * @param user data of user to sign up
     * @returns created user document and an authentication token
     */
    signUp = async (user: IUser): Promise<{ user: IUserDocument; token: string }> => {
        const userObject = await this.userModel.create(user)
        const token = await userObject.generateAuthToken()

        return { user: userObject, token }
    }

    /**
     * Method to generate an authentication token for a user
     * Actual email/password check occurs in passport.js
     * @param email email to login with
     * @returns the authentication token
     */
    login = async (email: string): Promise<string> => {
        const user = await this.userModel.findOne({ email })
        const token = await user?.generateAuthToken()

        if (token) {
            return token
        } else {
            throw new ApiError(Constants.UNABLE_TO_GENERATE_TOKEN, 500)
        }
    }

    /**
     * Method to logout
     * @param email Email of user to logout
     * @param jwt authentication token to remove from user's list
     */
    logout = async (email: string, jwt: string) => {
        const user = await this.userModel.findOne({ email })
        if (!user) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }
        user.tokens = user?.tokens?.filter((token) => token !== jwt)
        await user.save()
    }

    /**
     * Method to logout all devices
     * @param email email of user to delete all authentication tokens
     */
    logoutAll = async (email: string) => {
        const user = await this.userModel.findOne({ email })
        if (!user) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }
        user.tokens = []
        await user.save()
    }

    /**
     * Method to get a user's public details
     * @param id id of user to get
     * @returns user document
     */
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
        user.requestsToTeams = undefined
        user.requestsFromTeams = undefined

        return user
    }

    /**
     * Method to delete a user
     * @param id id of user to delete
     */
    deleteUser = async (id: string) => {
        await this.userModel.deleteOne({ _id: id })
    }

    /**
     * Method to request being rostered on a team
     * @param teamId id of team to join
     * @param userId id of player
     * @returns updated user document
     */
    requestRoster = async (teamId: string, userId: string): Promise<IUserDocument> => {
        const team = await Team.findById(teamId)
        const user = await User.findById(userId)

        if (!team) {
            throw new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404)
        }

        if (!user) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        const teamObjectId = new Types.ObjectId(teamId)
        const userObjectId = new Types.ObjectId(userId)

        // throw error if player is already requested to join team
        if (team.requestsFromPlayers?.includes(userObjectId) || user.requestsToTeams?.includes(teamObjectId)) {
            throw new ApiError(Constants.PLAYER_ALREADY_REQUESTED, 400)
        }

        // throw error if team already requested player to join team
        if (team.requestsToPlayers?.includes(userObjectId) || user.requestsFromTeams?.includes(teamObjectId)) {
            throw new ApiError(Constants.TEAM_ALREADY_REQUESTED, 400)
        }

        // throw error if player already joined team
        if (team.players.includes(userObjectId) || user.playerTeams?.includes(teamObjectId)) {
            throw new ApiError(Constants.TEAM_ALREADY_JOINED, 400)
        }

        team.requestsFromPlayers.push(userObjectId)
        user.requestsToTeams?.push(teamObjectId)

        await team.save()
        await user.save()

        return user
    }
}
