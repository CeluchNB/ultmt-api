import { ITeamModel } from '../models/team'
import { IUserModel } from '../models/user'
import { ApiError, IUser, IUserDocument } from '../types'
import * as Constants from '../utils/constants'
import UltmtValidator from '../utils/ultmt-validator'

export default class UserServices {
    userModel: IUserModel
    teamModel: ITeamModel

    constructor(userModel: IUserModel, teamModel: ITeamModel) {
        this.userModel = userModel
        this.teamModel = teamModel
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
            user.stats = []
            user.playerTeams = []
            user.managerTeams = []
        }
        user.requests = []

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
     * Method to change user's open to request status
     * @param id id of user
     * @param open boolean for open
     * @returns updated user document
     */
    setOpenToRequests = async (id: string, open: boolean): Promise<IUserDocument> => {
        const user = await this.userModel.findById(id)
        if (!user) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        user.openToRequests = open
        await user.save()

        return user
    }

    /**
     * Method to leave a team as a player
     * @param userId id of user
     * @param teamId id of team
     * @returns updated user document
     */
    leaveTeam = async (userId: string, teamId: string): Promise<IUserDocument> => {
        const user = await this.userModel.findById(userId)
        if (!user) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        const team = await this.teamModel.findById(teamId)
        if (!team) {
            throw new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404)
        }

        await new UltmtValidator(this.userModel, this.teamModel).userOnTeam(userId, teamId).test()

        user.playerTeams = user.playerTeams.filter((id) => !id.equals(team._id))
        team.players = team.players.filter((id) => !id.equals(user._id))

        await user.save()
        await team.save()

        return user
    }
}
