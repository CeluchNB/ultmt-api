import { Types } from 'mongoose'
import Team, { ITeamModel } from '../models/team'
import User, { IUserModel } from '../models/user'
import { ApiError, ITeam, ITeamDocument, IUserDocument } from '../types'
import * as Constants from '../utils/constants'

export default class TeamServices {
    teamModel: ITeamModel
    userModel: IUserModel

    constructor(teamModel: ITeamModel, userModel: IUserModel) {
        this.teamModel = teamModel
        this.userModel = userModel
    }

    /**
     * Creates a team
     * @param team team to create
     * @param user user that is the manager
     * @returns the created team
     */
    createTeam = async (team: ITeam, user: IUserDocument): Promise<ITeamDocument> => {
        const teamObject = await this.teamModel.create(team)

        teamObject.managers.push(user._id)
        await teamObject.save()

        user.managerTeams?.push(teamObject._id)
        await user.save()

        for (const i of team.requestsToPlayers) {
            const requestUser = await this.userModel.findById(i)
            requestUser?.requestsFromTeams?.push(teamObject._id)
            await requestUser?.save()
        }

        await teamObject.populate('managerArray')
        await teamObject.populate('requestsToPlayerArray')
        return teamObject
    }

    /**
     * Method to get details of a team
     * @param id id of team to get
     * @param publicReq server side determination of if this is going to a public user or a manager
     * @returns team document object
     */
    getTeam = async (id: string, publicReq: boolean): Promise<ITeamDocument> => {
        const teamObject = await this.teamModel.findById(id)
        if (!teamObject) {
            throw new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404)
        }

        if (publicReq) {
            teamObject.requestsFromPlayers = []
            teamObject.requestsToPlayers = []
        }

        return teamObject
    }

    /**
     * gets a team that is managed by the requesting user
     * @param teamId team id that is requested
     * @param userId user that is the manager
     * @returns the team document found
     */
    getManagedTeam = async (teamId: string, userId: string): Promise<ITeamDocument> => {
        const team = await this.getTeam(teamId, false)
        for (const mId of team.managers) {
            if (mId.toString() === userId.toString()) {
                return team
            }
        }
        throw new ApiError(Constants.UNAUTHORIZED_TO_GET_TEAM, 401)
    }

    /**
     * Method to add a request that a player join the roster
     * @param managerId manager of team
     * @param teamId id of team
     * @param userId player to request
     * @returns updated team document
     */
    rosterPlayer = async (managerId: string, teamId: string, userId: string): Promise<ITeamDocument> => {
        const team = await this.teamModel.findById(teamId)
        // handle non-found team case
        if (!team) {
            throw new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404)
        }

        // case where requesting user is not a manager
        if (!team.managers.includes(new Types.ObjectId(managerId))) {
            throw new ApiError(Constants.UNAUTHORIZED_TO_GET_TEAM, 401)
        }

        const user = await this.userModel.findById(userId)
        if (!user) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        const teamObjectId = new Types.ObjectId(teamId)
        const userObjectId = new Types.ObjectId(userId)

        // throw error if team has already requested to roster player
        if (user.requestsFromTeams?.includes(teamObjectId) || team.requestsToPlayers.includes(userObjectId)) {
            throw new ApiError(Constants.TEAM_ALREADY_REQUESTED, 400)
        }

        // throw error if player has already requested to be on team's roster
        if (user.requestsToTeams?.includes(teamObjectId) || team.requestsFromPlayers.includes(userObjectId)) {
            throw new ApiError(Constants.PLAYER_ALREADY_REQUESTED, 400)
        }

        if (user.playerTeams?.includes(teamObjectId) || team.players.includes(userObjectId)) {
            throw new ApiError(Constants.PLAYER_ALREADY_ROSTERED, 400)
        }

        user.requestsFromTeams?.push(teamObjectId)
        team.requestsToPlayers.push(userObjectId)

        await team.save()
        await user.save()

        return team
    }

    /**
     * Method to accept or deny a player's request to be rostered on the team
     * @param managerId manager of team
     * @param teamId teamId of request
     * @param userId playerId of request
     * @param accept boolean to confirm or deny request
     * @returns an updated team object
     */
    respondToRequest = async (
        managerId: string,
        teamId: string,
        userId: string,
        accept: boolean,
    ): Promise<ITeamDocument> => {
        const team = await Team.findById(teamId)
        if (!team) {
            throw new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404)
        }

        if (!team.managers.includes(new Types.ObjectId(managerId))) {
            throw new ApiError(Constants.UNAUTHORIZED_TO_GET_TEAM, 401)
        }

        const user = await User.findById(userId)
        if (!user) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        const userObjectId = new Types.ObjectId(userId)
        const teamObjectId = new Types.ObjectId(teamId)
        if (!user.requestsToTeams?.includes(teamObjectId) || !team.requestsFromPlayers.includes(userObjectId)) {
            throw new ApiError(Constants.NO_REQUEST, 400)
        }

        if (user.playerTeams?.includes(teamObjectId) || team.players.includes(userObjectId)) {
            throw new ApiError(Constants.PLAYER_ALREADY_ROSTERED, 400)
        }

        user.requestsToTeams = user.requestsToTeams?.filter((id) => !id.equals(teamObjectId))
        team.requestsFromPlayers = team.requestsFromPlayers.filter((id) => !id.equals(userObjectId))
        if (accept) {
            user.playerTeams?.push(teamObjectId)
            team.players.push(userObjectId)
        }

        await user.save()
        await team.save()

        return team
    }
}
