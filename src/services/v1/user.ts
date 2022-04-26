import { ITeamModel } from '../../models/team'
import { IUserModel } from '../../models/user'
import { ApiError, CreateUser, EmbeddedUser, IUser } from '../../types'
import * as Constants from '../../utils/constants'
import UltmtValidator from '../../utils/ultmt-validator'
import { getEmbeddedUser } from '../../utils/utils'
import levenshtein from 'js-levenshtein'

interface LevenshteinUser {
    user: IUser
    distance: number
}

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
    signUp = async (user: CreateUser): Promise<{ user: IUser; token: string }> => {
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
    getUser = async (id: string): Promise<IUser> => {
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
    setOpenToRequests = async (id: string, open: boolean): Promise<IUser> => {
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
    leaveTeam = async (userId: string, teamId: string): Promise<IUser> => {
        const user = await this.userModel.findById(userId)
        if (!user) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        const team = await this.teamModel.findById(teamId)
        if (!team) {
            throw new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404)
        }

        await new UltmtValidator(this.userModel, this.teamModel).userOnTeam(userId, teamId).test()

        user.playerTeams = user.playerTeams.filter((pTeam) => !pTeam._id.equals(team._id))
        team.players = team.players.filter((player) => !player._id.equals(user._id))

        await user.save()
        await team.save()

        return user
    }

    /**
     * Method to search for users by text
     * @param term term to search users with
     * @returns array of embedded users
     */
    searchUsers = async (term: string): Promise<EmbeddedUser[]> => {
        await new UltmtValidator().enoughSearchCharacters(term).test()

        const terms = term.split(' ')
        const regexes = terms.map((t) => {
            if (t.length >= 3) {
                return new RegExp(`^${t}`, 'i')
            }
        })

        const tests = []
        for (const r of regexes) {
            if (r) {
                tests.push({ firstName: { $regex: r } })
                tests.push({ lastName: { $regex: r } })
                tests.push({ username: { $regex: r } })
            }
        }

        const users = await this.userModel.find({
            $or: tests,
            openToRequests: true,
        })

        if (terms.length >= 2 && users.length > 1) {
            const levenshteinUsers: LevenshteinUser[] = users.map((u) => {
                return {
                    user: u,
                    distance: levenshtein(term, `${u.firstName} ${u.lastName}`) + levenshtein(term, u.username),
                }
            })

            levenshteinUsers.sort((a, b) => {
                return a.distance - b.distance
            })

            return levenshteinUsers.map((lu) => getEmbeddedUser(lu.user))
        }

        return users.map((u) => getEmbeddedUser(u))
    }

    /**
     * Method to leave a team as a manager.  User can only remove himself as a manager.
     * @param teamId team that manager is leaving
     * @param managerId manager to remove
     * @returns new team
     */
    leaveManagerRole = async (teamId: string, managerId: string): Promise<IUser> => {
        const team = await this.teamModel.findById(teamId)
        if (!team) {
            throw new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404)
        }

        const manager = await this.userModel.findById(managerId)
        if (!manager) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        await new UltmtValidator(this.userModel, this.teamModel).userIsManager(managerId, teamId).test()

        if (team.managers.length < 2) {
            throw new ApiError(Constants.USER_IS_ONLY_MANAGER, 400)
        }

        team.managers = team.managers.filter((user) => !user._id.equals(managerId))
        await team.save()

        manager.managerTeams = manager.managerTeams.filter((t) => !t._id.equals(teamId))
        await manager.save()

        return manager
    }

    /**
     * Method to update user's password
     * @param userId id of user
     * @param newPassword new password of user
     * @returns updated user
     */
    changePassword = async (userId: string, newPassword: string): Promise<{ user: IUser; token: string }> => {
        const user = await this.userModel.findById(userId)
        if (!user) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }
        user.tokens = []
        user.password = newPassword
        await user.save()
        const token = await user.generateAuthToken()

        return { user, token }
    }

    /**
     * Method to change the email of user
     * @param userId id of user
     * @param newEmail new email of user
     * @returns updated user
     */
    changeEmail = async (userId: string, newEmail: string): Promise<IUser> => {
        const user = await this.userModel.findById(userId)
        if (!user) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }
        user.email = newEmail
        await user.save()

        return user
    }

    /**
     * Method to change a user's name
     * @param userId id of user
     * @param newFirstName optional new first name for user
     * @param newLastName optional new last name for user
     * @return updated user
     */
    changeName = async (userId: string, newFirstName?: string, newLastName?: string): Promise<IUser> => {
        const user = await this.userModel.findById(userId)
        if (!user) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        if (newFirstName) {
            user.firstName = newFirstName
        }

        if (newLastName) {
            user.lastName = newLastName
        }
        await user.save()

        return user
    }
}
