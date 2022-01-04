import { IRosterRequestModel } from '../models/roster-request'
import { IUserModel } from '../models/user'
import { ITeamModel } from '../models/team'
import { ApiError, Initiator, IRosterRequest, Status } from '../types'
import * as Constants from '../utils/constants'
import UltmtValidator from '../utils/ultmt-validator'
import { Types } from 'mongoose'
import { getEmbeddedTeam, getEmbeddedUser } from '../utils/utils'

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
    requestFromTeam = async (managerId: string, teamId: string, userId: string): Promise<IRosterRequest> => {
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
            .userAcceptingRequests(userId)
            .test()

        const requestData: IRosterRequest = {
            _id: new Types.ObjectId(),
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
    requestFromPlayer = async (userId: string, teamId: string): Promise<IRosterRequest> => {
        const user = await this.userModel.findById(userId)
        if (!user) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        const team = await this.teamModel.findById(teamId)
        if (!team) {
            throw new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404)
        }

        await new UltmtValidator(this.userModel, this.teamModel, this.rosterRequestModel)
            .noPendingRequest(userId, teamId, Initiator.Player)
            .userNotOnTeam(userId, teamId)
            .teamAcceptingRequests(teamId)
            .test()

        const requestData: IRosterRequest = {
            _id: new Types.ObjectId(),
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
    teamRespondToRequest = async (managerId: string, requestId: string, approve: boolean): Promise<IRosterRequest> => {
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
            team.players.push(getEmbeddedUser(user))

            // add team to player but don't remove request from list
            user?.playerTeams.push(getEmbeddedTeam(team))

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
    userRespondToRequest = async (userId: string, requestId: string, approve: boolean): Promise<IRosterRequest> => {
        const request = await this.rosterRequestModel.findById(requestId)
        if (!request) {
            throw new ApiError(Constants.UNABLE_TO_FIND_REQUEST, 404)
        }

        const user = await this.userModel.findById(userId)
        if (!user) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        await new UltmtValidator(this.userModel, this.teamModel, this.rosterRequestModel)
            .requestIsTeamInitiated(requestId)
            .requestIsPending(request._id)
            .userOnRequest(user._id, request._id)
            .test()

        const team = await this.teamModel.findById(request?.team)
        if (!team) {
            throw new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404)
        }

        if (approve) {
            // add player to team and remove request from team's list
            team?.players.push(getEmbeddedUser(user))

            // add team to player but don't remove request from list
            user.playerTeams.push(getEmbeddedTeam(team))

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

    /**
     * Method to delete request from team
     * @param managerId id of team manager
     * @param requestId id of request
     * @returns document of deleted roster request
     */
    teamDelete = async (managerId: string, requestId: string): Promise<IRosterRequest> => {
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
            // team must contain request, cannot solely delete from user's queue
            .teamContainsRequest(team._id, request._id)
            .test()

        team.requests = team.requests.filter((id) => !id.equals(request._id))
        user.requests = user.requests.filter((id) => !id.equals(request._id))

        await request.delete()
        await team.save()
        await user.save()

        return request
    }

    /**
     * Method to delete request by user
     * @param userId id of user
     * @param requestId id of request
     * @returns document of deleted roster request
     */
    userDelete = async (userId: string, requestId: string): Promise<IRosterRequest> => {
        const request = await this.rosterRequestModel.findById(requestId)
        if (!request) {
            throw new ApiError(Constants.UNABLE_TO_FIND_REQUEST, 404)
        }

        const team = await this.teamModel.findById(request.team)
        if (!team) {
            throw new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404)
        }

        const user = await this.userModel.findById(userId)
        if (!user) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        await new UltmtValidator(this.userModel, this.teamModel, this.rosterRequestModel)
            .userOnRequest(userId, requestId)
            .userContainsRequest(userId, requestId)
            .test()

        team.requests = team.requests.filter((id) => !id.equals(request._id))
        user.requests = user.requests.filter((id) => !id.equals(request._id))

        await request.delete()
        await team.save()
        await user.save()

        return request
    }
}
