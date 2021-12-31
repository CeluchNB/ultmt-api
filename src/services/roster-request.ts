import { IRosterRequestModel } from '../models/roster-request'
import { IUserModel } from '../models/user'
import { ITeamModel } from '../models/team'
import { ApiError, Initiator, IRosterRequest, IRosterRequestDocument, Status } from '../types'
import * as Constants from '../utils/constants'
import UltmtValidator from '../utils/ultmt-validator'

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
        const team = await this.teamModel.findById(teamId)
        if (!team) {
            throw new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404)
        }

        const user = await this.userModel.findById(userId)
        if (!user) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        await new UltmtValidator(this.userModel, this.teamModel, this.rosterRequestModel)
            .userExists(managerId)
            .userIsManager(managerId, teamId)
            .noPendingRequest(userId, teamId, Initiator.Team)
            .userNotOnTeam(userId, teamId)
            .test()

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
        await new UltmtValidator(this.userModel, this.teamModel, this.rosterRequestModel)
            .noPendingRequest(userId, teamId, Initiator.Player)
            .userNotOnTeam(userId, teamId)
            .test()

        const user = await this.userModel.findById(userId)
        if (!user) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        const team = await this.teamModel.findById(teamId)
        if (!team) {
            throw new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404)
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
     * Method to respond to request to team
     * @param managerId id of team manager
     * @param requestId id of request
     * @param approve boolean for approve or deny
     * @returns roster request
     */
    teamRespondToRequest = async (
        managerId: string,
        requestId: string,
        approve: boolean,
    ): Promise<IRosterRequestDocument> => {
        const request = await this.rosterRequestModel.findById(requestId)
        if (!request) {
            throw new ApiError(Constants.UNABLE_TO_FIND_REQUEST, 404)
        }

        const team = await this.teamModel.findById(request?.team)
        if (!team) {
            throw new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404)
        }

        const user = await this.userModel.findById(request?.user)
        if (!user) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        await new UltmtValidator(this.userModel, this.teamModel, this.rosterRequestModel)
            .userExists(managerId)
            .userIsManager(managerId, team._id)
            .requestIsUserInitiated(requestId)
            .requestIsPending(request._id)
            .test()

        if (approve) {
            // add player to team and remove request from team's list
            team.players.push(user?._id)

            // add team to player but don't remove request from list
            user?.playerTeams.push(team._id)

            // set status to approved
            request.status = Status.Approved
        } else {
            request.status = Status.Denied
        }

        // filter request from team list, but leave in player list
        team.requests = team?.requests.filter((id) => !id.equals(request._id))

        await team.save()
        await user?.save()
        await request.save()
        return request
    }

    /**
     * Method for use to respond to request
     * @param userId id of responding user
     * @param requestId id of request to respond to
     * @param approve boolean for approve or deny
     * @returns
     */
    userRespondToRequest = async (
        userId: string,
        requestId: string,
        approve: boolean,
    ): Promise<IRosterRequestDocument> => {
        const request = await this.rosterRequestModel.findById(requestId)
        if (!request) {
            throw new ApiError(Constants.UNABLE_TO_FIND_REQUEST, 404)
        }

        const user = await this.userModel.findById(userId)
        if (!user) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        await new UltmtValidator(this.userModel, this.teamModel, this.rosterRequestModel)
            .teamExists(request?.team.toString())
            .requestIsTeamInitiated(requestId)
            .requestIsPending(request._id)
            .userOnRequest(user._id, request._id)
            .test()

        const team = await this.teamModel.findById(request?.team)

        if (approve) {
            // add player to team and remove request from team's list
            team?.players.push(user._id)

            // add team to player but don't remove request from list
            user.playerTeams.push(team?._id)

            // set status to approved
            request.status = Status.Approved
        } else {
            request.status = Status.Denied
        }

        // filter out request from user list, but leave in team list
        user.requests = user.requests.filter((id) => !id.equals(request._id))

        await request.save()
        await user.save()
        await team?.save()

        return request
    }

    teamDelete = async (managerId: string, requestId: string): Promise<IRosterRequestDocument> => {
        const request = await this.rosterRequestModel.findById(requestId)
        if (!request) {
            throw new ApiError(Constants.UNABLE_TO_FIND_REQUEST, 404)
        }

        const user = await this.userModel.findById(request.user)
        if (!user) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        const team = await this.teamModel.findById(request.team)
        if (!team) {
            throw new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404)
        }

        await new UltmtValidator(this.userModel, this.teamModel, this.rosterRequestModel)
            .userIsManager(managerId, request?.team.toString())
            .teamContainsRequest(team._id, request._id)
            .test()

        team.requests = team.requests.filter((id) => !id.equals(request._id))
        user.requests = user.requests.filter((id) => !id.equals(request._id))

        await request.delete()
        await team.save()
        await user.save()

        return request
    }
}
