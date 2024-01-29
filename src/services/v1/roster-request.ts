import { IRosterRequestModel } from '../../models/roster-request'
import { IUserModel } from '../../models/user'
import { ITeamModel } from '../../models/team'
import { ApiError, IDetailedRosterRequest, Initiator, IRosterRequest, Status } from '../../types'
import * as Constants from '../../utils/constants'
import UltmtValidator from '../../utils/ultmt-validator'
import { Types } from 'mongoose'
import { getEmbeddedTeam, getEmbeddedUser } from '../../utils/utils'

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
     * Method to get the details of a roster requets
     * @param id get roster request details
     */
    getRosterRequest = async (id: string, userId: string): Promise<IDetailedRosterRequest> => {
        const rosterRequest = await this.rosterRequestModel
            .findById(id)
            .populate('teamDetails', ['_id', 'place', 'name', 'teamname', 'seasonStart', 'seasonEnd'])
            .populate('userDetails', ['_id', 'firstName', 'lastName', 'username'])
        if (!rosterRequest) {
            throw new ApiError(Constants.UNABLE_TO_FIND_REQUEST, 404)
        }
        await new UltmtValidator(this.userModel, this.teamModel, this.rosterRequestModel)
            .userAuthorizedForRequest(userId, id)
            .test()

        return rosterRequest
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
            .userIsManager(managerId, team._id.toHexString())
            .requestIsUserInitiated(requestId)
            .requestIsPending(request._id.toHexString())
            .userNotOnTeam(user._id.toHexString(), team._id.toHexString())
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

        const team = await this.teamModel.findById(request?.team)
        if (!team) {
            throw new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404)
        }

        await new UltmtValidator(this.userModel, this.teamModel, this.rosterRequestModel)
            .requestIsTeamInitiated(requestId)
            .requestIsPending(request._id.toHexString())
            .userOnRequest(user._id.toHexString(), request._id.toHexString())
            .userNotOnTeam(user._id.toHexString(), team._id.toHexString())
            .test()

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

        const team = await this.teamModel.findById(request.team)
        if (!team) {
            throw new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404)
        }

        await new UltmtValidator(this.userModel, this.teamModel, this.rosterRequestModel)
            .userIsManager(managerId, request?.team.toString())
            // team must contain request, cannot solely delete from user's queue
            .teamContainsRequest(team._id.toString(), request._id.toString())
            .test()

        team.requests = team.requests.filter((id) => !id.equals(request._id))
        if (user) {
            user.requests = user.requests.filter((id) => !id.equals(request._id))
            await user.save()
        }

        await request.deleteOne()
        await team.save()

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

        const user = await this.userModel.findById(userId)
        if (!user) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        await new UltmtValidator(this.userModel, this.teamModel, this.rosterRequestModel)
            .userOnRequest(userId, requestId)
            .userContainsRequest(userId, requestId)
            .test()

        if (team) {
            team.requests = team.requests.filter((id) => !id.equals(request._id))
            await team.save()
        }
        user.requests = user.requests.filter((id) => !id.equals(request._id))

        await request.deleteOne()
        await user.save()

        return request
    }

    /**
     * Method to get all requests related to a team
     * @param teamId id of team to get requests for
     * @returns list of requests
     */
    getRequestsByTeam = async (teamId: string, managerId: string): Promise<IDetailedRosterRequest[]> => {
        const team = await this.teamModel.findById(teamId)
        if (!team) {
            throw new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404)
        }

        await new UltmtValidator(this.userModel, this.teamModel).userIsManager(managerId, teamId)

        const requests = await this.rosterRequestModel
            .find({ _id: { $in: team.requests } })
            .populate('teamDetails', ['_id', 'place', 'name', 'teamname', 'seasonStart', 'seasonEnd'])
            .populate('userDetails', ['_id', 'firstName', 'lastName', 'username'])

        return requests
    }

    /**
     * Method to get all requests belonging to a user
     * @param userId id of user to get requests for
     * @returns list of requests
     */
    getRequestsByUser = async (userId: string): Promise<IDetailedRosterRequest[]> => {
        const user = await this.userModel.findById(userId)
        if (!user) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        const requests = await this.rosterRequestModel
            .find({ _id: { $in: user.requests } })
            .populate('teamDetails', ['_id', 'place', 'name', 'teamname', 'seasonStart', 'seasonEnd'])
            .populate('userDetails', ['_id', 'firstName', 'lastName', 'username'])

        return requests
    }
}
