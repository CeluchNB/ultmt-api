import { IRosterRequestModel } from '../models/roster-request'
import { IUserModel } from '../models/user'
import { ITeamModel } from '../models/team'
import { ApiError, Initiator, IRosterRequest, IRosterRequestDocument, Status } from '../types'
import * as Constants from '../utils/constants'

export default class RosterRequestServices {
    teamModel: ITeamModel
    userModel: IUserModel
    rosterRequestModel: IRosterRequestModel

    constructor(teamModel: ITeamModel, userModel: IUserModel, rosterRequestModel: IRosterRequestModel) {
        this.teamModel = teamModel
        this.userModel = userModel
        this.rosterRequestModel = rosterRequestModel
    }

    requestFromTeam = async (managerId: string, teamId: string, userId: string): Promise<IRosterRequestDocument> => {
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

        user.requests.push(request._id)
        await user.save()

        team.requests.push(request._id)
        await team.save()

        return request
    }

    requestFromPlayer = async (userId: string, teamId: string): Promise<IRosterRequestDocument> => {
        const rosterRequest = (await this.rosterRequestModel.findById(userId)) as IRosterRequestDocument
        return rosterRequest
    }
}
