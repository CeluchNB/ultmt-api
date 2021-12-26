import { IRosterRequestModel } from '../models/roster-request'
import { IUserModel } from '../models/user'
import { ITeamModel } from '../models/team'
import { ApiError, Initiator, IRosterRequest, IRosterRequestDocument, Status } from '../types'
import * as Constants from '../utils/constants'
import { Types } from 'mongoose'

export default class RosterRequestServices {
    teamModel: ITeamModel
    userModel: IUserModel
    rosterRequestModel: IRosterRequestModel

    constructor(teamModel: ITeamModel, userModel: IUserModel, rosterRequestModel: IRosterRequestModel) {
        this.teamModel = teamModel
        this.userModel = userModel
        this.rosterRequestModel = rosterRequestModel
    }

    /**
     * Method to create a request from a player to a team
     * @param managerId id of requesting manager for team
     * @param teamId id of team
     * @param userId id of user requested for roster
     * @returns roster request document
     */
    requestFromTeam = async (managerId: string, teamId: string, userId: string): Promise<IRosterRequestDocument> => {
        const requestGuard = await this.rosterRequestModel.findOne({
            user: new Types.ObjectId(userId),
            team: new Types.ObjectId(teamId),
            requestSource: Initiator.Team,
            status: Status.Pending,
        })
        if (requestGuard) {
            throw new ApiError(Constants.TEAM_ALREADY_REQUESTED, 400)
        }

        const manager = await this.userModel.findById(managerId)
        if (!manager) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        const team = await this.teamModel.findById(teamId)
        if (!team) {
            throw new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404)
        }

        if (!team.managers.includes(manager._id)) {
            throw new ApiError(Constants.UNAUTHORIZED_MANAGER, 401)
        }

        const user = await this.userModel.findById(userId)
        if (!user) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        if (team.players.includes(user._id)) {
            throw new ApiError(Constants.PLAYER_ALREADY_ROSTERED, 400)
        }

        const requestData: IRosterRequest = {
            team: team._id,
            user: user._id,
            requestSource: Initiator.Team,
            status: Status.Pending,
        }

        const request = await this.rosterRequestModel.create(requestData)

        // add roster request document to user and team
        user.requests.push(request._id)
        await user.save()

        team.requests.push(request._id)
        await team.save()

        return request
    }

    /**
     * Method to request to join a team from a player
     * @param userId id of user requesting to join team
     * @param teamId id of team
     * @returns roster request document
     */
    requestFromPlayer = async (userId: string, teamId: string): Promise<IRosterRequestDocument> => {
        const requestGuard = await this.rosterRequestModel.findOne({
            user: new Types.ObjectId(userId),
            team: new Types.ObjectId(teamId),
            requestSource: Initiator.Player,
            status: Status.Pending,
        })
        if (requestGuard) {
            throw new ApiError(Constants.PLAYER_ALREADY_REQUESTED, 400)
        }

        const user = await this.userModel.findById(userId)
        if (!user) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        const team = await this.teamModel.findById(teamId)
        if (!team) {
            throw new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404)
        }

        if (user.playerTeams.includes(team._id)) {
            throw new ApiError(Constants.TEAM_ALREADY_JOINED, 400)
        }

        const requestData: IRosterRequest = {
            team: team._id,
            user: user._id,
            requestSource: Initiator.Player,
            status: Status.Pending,
        }

        const request = await this.rosterRequestModel.create(requestData)

        // add roster request document to user and team
        user.requests.push(request._id)
        await user.save()

        team.requests.push(request._id)
        await team.save()

        return request
    }

    /**
     *
     * @param managerId manager id t
     * @param requestId
     * @returns
     */
    teamAcceptRequest = async (managerId: string, requestId: string): Promise<IRosterRequestDocument> => {
        const manager = await this.userModel.findById(managerId)
        if (!manager) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        const request = await this.rosterRequestModel.findById(requestId)
        if (!request) {
            throw new ApiError(Constants.UNABLE_TO_FIND_REQUEST, 404)
        }

        const team = await this.teamModel.findById(request.team)
        if (!team) {
            throw new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404)
        }

        if (!team.managers.includes(manager._id)) {
            throw new ApiError(Constants.UNAUTHORIZED_MANAGER, 401)
        }

        const user = await this.userModel.findById(request.user)
        if (!user) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        // add player to team and remove request from team's list
        team.players.push(user._id)
        team.requests = team.requests.filter((id) => !id.equals(request._id))
        await team.save()

        // add team to player but don't remove request from list
        user.playerTeams.push(team._id)
        await user.save()

        // set status to approved
        request.status = Status.Approved
        await request.save()

        return request
    }
}