import { ITeamModel } from '../../models/team'
import User, { IUserModel } from '../../models/user'
import OneTimePasscode, { IOneTimePasscodeModel } from '../../models/one-time-passcode'
import { ApiError, CreateUser, EmbeddedUser, UserProfile, IUser, OTPReason, Tokens } from '../../types'
import * as Constants from '../../utils/constants'
import UltmtValidator from '../../utils/ultmt-validator'
import { getEmbeddedTeam, getEmbeddedUser, getPasscodeHtml } from '../../utils/utils'
import levenshtein from 'js-levenshtein'
import sgMail from '@sendgrid/mail'
import { FilterQuery } from 'mongoose'

interface LevenshteinUser {
    user: IUser
    distance: number
}

export default class UserServices {
    userModel: IUserModel
    teamModel: ITeamModel
    otpModel: IOneTimePasscodeModel

    constructor(userModel: IUserModel, teamModel: ITeamModel, otpModel: IOneTimePasscodeModel = OneTimePasscode) {
        this.userModel = userModel
        this.teamModel = teamModel
        this.otpModel = otpModel
    }

    /**
     * Method to sign a user up
     * @param user data of user to sign up
     * @returns created user document and an authentication token
     */
    signUp = async (user: CreateUser): Promise<{ user: IUser; tokens: Tokens }> => {
        const userObject = await this.userModel.create(user)
        const access = await userObject.generateAuthToken()
        const refresh = await userObject.generateRefreshToken()

        return { user: userObject, tokens: { access, refresh } }
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

        user.requests = []

        return user
    }

    /**
     * Method to get full user data for a user to get himself
     * @param id id of user to get
     * @returns user
     */
    getMe = async (id: string): Promise<UserProfile> => {
        const user = await this.userModel.findById(id)

        if (!user) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        const teams = []
        for (const team of user.managerTeams) {
            const fullTeam = await this.teamModel.findById(team._id)
            if (fullTeam) {
                teams.push(fullTeam)
            }
        }

        return { user, fullManagerTeams: teams }
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
    searchUsers = async (term: string, openToRequests?: boolean): Promise<EmbeddedUser[]> => {
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

        const andCases: FilterQuery<IUser>[] = [{ $or: [{ guest: false }, { guest: { $exists: false } }] }]
        if (openToRequests !== undefined) {
            andCases.push({ openToRequests })
        }

        const users = await this.userModel.find({
            $or: tests,
            $and: andCases,
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
    changePassword = async (userId: string, newPassword: string): Promise<{ user: IUser; tokens: Tokens }> => {
        const user = await this.userModel.findById(userId)
        if (!user) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        user.password = newPassword
        await user.save()
        const access = await user.generateAuthToken()
        const refresh = await user.generateRefreshToken()

        return { user, tokens: { access, refresh } }
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

    /**
     * Method for a user to generate an OTP for password recovery
     * @param userEmail email of user to request password reset
     * @returns nothing
     */
    requestPasswordRecovery = async (userEmail: string): Promise<void> => {
        const user = await User.findOne({ email: userEmail.toLowerCase() })
        if (!user) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        const otp = await this.otpModel.create({
            creator: user._id,
            reason: OTPReason.PasswordRecovery,
        })

        try {
            await sgMail.send({
                to: userEmail,
                from: 'developer@theultmtapp.com',
                subject: 'Create a new password!',
                html: getPasscodeHtml(user.firstName, otp.passcode),
            })
        } catch (error) {
            await otp.deleteOne()
            throw new ApiError(Constants.UNABLE_TO_SEND_EMAIL, 500)
        }
    }

    /**
     * Method to redeem passcode and set new password
     * @param passcode passcode to redeem for new password
     * @param newPassword new password to set
     * @returns token and user details
     */
    resetPassword = async (passcode: string, newPassword: string): Promise<{ user: IUser; tokens: Tokens }> => {
        // validate OTP
        const otp = await OneTimePasscode.findOne({ passcode })
        if (!otp || otp.isExpired()) {
            throw new ApiError(Constants.INVALID_PASSCODE, 400)
        }

        const user = await User.findById(otp.creator)
        if (!user) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }
        user.password = newPassword
        await user.save()

        const access = await user.generateAuthToken()
        const refresh = await user.generateRefreshToken()

        // delete otp
        await otp.deleteOne()
        return { user, tokens: { access, refresh } }
    }

    /**
     * Method to change user's private status
     * @param userId id of user to set private account value
     * @param privateAccount user's private status
     * @returns updated user
     */
    setPrivateAccount = async (userId: string, privateAccount: boolean): Promise<IUser> => {
        const user = await User.findById(userId)
        if (!user) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        user.private = privateAccount
        await user.save()

        return user
    }

    /**
     * Method to join a team by code
     * @param userId id of user
     * @param passcode passcode for team
     * @returns updated user
     */
    joinByCode = async (userId: string, passcode: string): Promise<IUser> => {
        const user = await this.userModel.findById(userId)
        if (!user) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        const otp = await this.otpModel.findOne({ passcode })
        if (!otp || otp.isExpired()) {
            throw new ApiError(Constants.INVALID_PASSCODE, 400)
        }

        const team = await this.teamModel.findById(otp.team)
        if (!team) {
            throw new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404)
        }

        await new UltmtValidator(this.userModel, this.teamModel)
            .userNotOnTeam(user._id.toHexString(), team._id.toHexString())
            .test()

        team.players.push(getEmbeddedUser(user))
        await team.save()

        user.playerTeams.push(getEmbeddedTeam(team))
        await user.save()

        return user
    }

    /**
     * Method to check for a used username
     * @param username username user is attempting to use
     * @returns boolean
     */
    usernameTaken = async (username?: string): Promise<boolean> => {
        if (!username || username.length < 2) {
            throw new ApiError(Constants.INVALID_USERNAME, 400)
        }

        const users = await this.userModel.find({ username })
        return users.length > 0
    }
}
