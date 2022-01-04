import User, { IUserModel } from '../models/user'
import Team, { ITeamModel } from '../models/team'
import RosterRequest, { IRosterRequestModel } from '../models/roster-request'
import { ApiError, Initiator, Status } from '../types'
import * as Constants from './constants'
import { Types } from 'mongoose'

enum ValidationType {
    USER_EXISTS,
    TEAM_EXISTS,
    REQUEST_EXISTS,
    USER_IS_MANAGER,
    REQUEST_IS_TEAM_INITIATED,
    REQUEST_IS_USER_INITIATED,
    NO_PENDING_REQUEST,
    REQUEST_IS_PENDING,
    PLAYER_NOT_ON_TEAM,
    USER_ON_REQUEST,
    TEAM_CONTAINS_REQUEST,
    USER_CONTAINS_REQUEST,
    USER_ON_TEAM,
    USER_ACCEPTING_REQUESTS,
    TEAM_ACCEPTING_REQUESTS,
}

type Validation = {
    type: ValidationType
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any
}

export default class UltmtValidator {
    userModel: IUserModel
    teamModel: ITeamModel
    rosterRequestModel: IRosterRequestModel
    validations: Validation[] = []

    constructor(
        userModel: IUserModel = User,
        teamModel: ITeamModel = Team,
        rosterRequestModel: IRosterRequestModel = RosterRequest,
    ) {
        this.userModel = userModel
        this.teamModel = teamModel
        this.rosterRequestModel = rosterRequestModel
    }

    userExists = (id: string): UltmtValidator => {
        this.validations.push({ type: ValidationType.USER_EXISTS, data: { id } })
        return this
    }

    teamExists = (id: string): UltmtValidator => {
        this.validations.push({ type: ValidationType.TEAM_EXISTS, data: { id } })
        return this
    }

    requestExists = (id: string): UltmtValidator => {
        this.validations.push({ type: ValidationType.REQUEST_EXISTS, data: { id } })
        return this
    }

    userIsManager = (userId: string, teamId: string): UltmtValidator => {
        this.validations.push({ type: ValidationType.USER_IS_MANAGER, data: { userId, teamId } })
        return this
    }

    requestIsTeamInitiated = (id: string): UltmtValidator => {
        this.validations.push({ type: ValidationType.REQUEST_IS_TEAM_INITIATED, data: { id } })
        return this
    }

    requestIsUserInitiated = (id: string): UltmtValidator => {
        this.validations.push({ type: ValidationType.REQUEST_IS_USER_INITIATED, data: { id } })
        return this
    }

    noPendingRequest = (userId: string, teamId: string, source: Initiator): UltmtValidator => {
        this.validations.push({ type: ValidationType.NO_PENDING_REQUEST, data: { userId, teamId, source } })
        return this
    }

    requestIsPending = (id: string): UltmtValidator => {
        this.validations.push({ type: ValidationType.REQUEST_IS_PENDING, data: { id } })
        return this
    }

    userNotOnTeam = (userId: string, teamId: string): UltmtValidator => {
        this.validations.push({ type: ValidationType.PLAYER_NOT_ON_TEAM, data: { userId, teamId } })
        return this
    }

    userOnRequest = (userId: string, requestId: string): UltmtValidator => {
        this.validations.push({ type: ValidationType.USER_ON_REQUEST, data: { userId, requestId } })
        return this
    }

    teamContainsRequest = (teamId: string, requestId: string): UltmtValidator => {
        this.validations.push({ type: ValidationType.TEAM_CONTAINS_REQUEST, data: { teamId, requestId } })
        return this
    }

    userContainsRequest = (userId: string, requestId: string): UltmtValidator => {
        this.validations.push({ type: ValidationType.USER_CONTAINS_REQUEST, data: { userId, requestId } })
        return this
    }

    userOnTeam = (userId: string, teamId: string): UltmtValidator => {
        this.validations.push({ type: ValidationType.USER_ON_TEAM, data: { userId, teamId } })
        return this
    }

    userAcceptingRequests = (userId: string): UltmtValidator => {
        this.validations.push({ type: ValidationType.USER_ACCEPTING_REQUESTS, data: { userId } })
        return this
    }

    teamAcceptingRequests = (teamId: string): UltmtValidator => {
        this.validations.push({ type: ValidationType.TEAM_ACCEPTING_REQUESTS, data: { teamId } })
        return this
    }

    test = async (): Promise<boolean> => {
        for (const i of this.validations) {
            await this.performCheck(i)
        }
        return true
    }

    private performCheck = async (validation: Validation) => {
        switch (validation.type) {
            case ValidationType.USER_EXISTS: {
                const user = await this.userModel.findById(validation.data.id)
                if (!user) {
                    throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
                }
                break
            }
            case ValidationType.TEAM_EXISTS: {
                const team = await this.teamModel.findById(validation.data.id)
                if (!team) {
                    throw new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404)
                }
                break
            }
            case ValidationType.REQUEST_EXISTS: {
                const request = await this.rosterRequestModel.findById(validation.data.id)
                if (!request) {
                    throw new ApiError(Constants.UNABLE_TO_FIND_REQUEST, 404)
                }
                break
            }
            case ValidationType.USER_IS_MANAGER: {
                const manager = await this.userModel.findById(validation.data.userId)
                const managingTeam = await this.teamModel.findById(validation.data.teamId)

                if (!managingTeam?.managers.includes(manager?._id)) {
                    throw new ApiError(Constants.UNAUTHORIZED_MANAGER, 401)
                }

                if (manager) {
                    for (const i of manager?.managerTeams) {
                        if (i._id.equals(managingTeam?._id)) {
                            return
                        }
                    }
                }
                throw new ApiError(Constants.UNAUTHORIZED_MANAGER, 401)
            }
            case ValidationType.REQUEST_IS_TEAM_INITIATED: {
                const request = await this.rosterRequestModel.findById(validation.data.id)
                if (request?.requestSource !== Initiator.Team) {
                    throw new ApiError(Constants.NOT_ALLOWED_TO_RESPOND, 400)
                }
                break
            }
            case ValidationType.REQUEST_IS_USER_INITIATED: {
                const request = await this.rosterRequestModel.findById(validation.data.id)
                if (request?.requestSource !== Initiator.Player) {
                    throw new ApiError(Constants.NOT_ALLOWED_TO_RESPOND, 400)
                }
                break
            }
            case ValidationType.NO_PENDING_REQUEST: {
                const { userId, teamId, source } = validation.data
                const request = await this.rosterRequestModel.findOne({
                    user: new Types.ObjectId(userId),
                    team: new Types.ObjectId(teamId),
                    requestSource: source,
                    status: Status.Pending,
                })

                if (request) {
                    if (source === Initiator.Team) {
                        throw new ApiError(Constants.TEAM_ALREADY_REQUESTED, 400)
                    } else {
                        throw new ApiError(Constants.PLAYER_ALREADY_REQUESTED, 400)
                    }
                }
                break
            }
            case ValidationType.REQUEST_IS_PENDING: {
                const request = await this.rosterRequestModel.findById(validation.data.id)
                if (request?.status !== Status.Pending) {
                    throw new ApiError(Constants.REQUEST_ALREADY_RESOLVED, 400)
                }
                break
            }
            case ValidationType.PLAYER_NOT_ON_TEAM: {
                const { userId, teamId } = validation.data
                const user = await this.userModel.findById(userId)
                const team = await this.teamModel.findById(teamId)

                if (team?.players.includes(user?._id)) {
                    throw new ApiError(Constants.PLAYER_ALREADY_ROSTERED, 400)
                }

                if (user) {
                    for (const i of user?.playerTeams) {
                        if (i._id.equals(team?._id)) {
                            throw new ApiError(Constants.PLAYER_ALREADY_ROSTERED, 400)
                        }
                    }
                }
                break
            }
            case ValidationType.USER_ON_REQUEST: {
                const { userId, requestId } = validation.data
                const request = await this.rosterRequestModel.findById(requestId)
                const user = await this.userModel.findById(userId)

                if (!request?.user.equals(user?._id)) {
                    throw new ApiError(Constants.NOT_ALLOWED_TO_RESPOND, 400)
                }
                break
            }
            case ValidationType.TEAM_CONTAINS_REQUEST: {
                const { teamId, requestId } = validation.data

                const team = await this.teamModel.findById(teamId)

                if (!team?.requests.includes(new Types.ObjectId(requestId))) {
                    throw new ApiError(Constants.REQUEST_NOT_IN_LIST, 400)
                }
                break
            }
            case ValidationType.USER_CONTAINS_REQUEST: {
                const { userId, requestId } = validation.data
                const user = await this.userModel.findById(userId)

                if (!user?.requests.includes(new Types.ObjectId(requestId))) {
                    throw new ApiError(Constants.REQUEST_NOT_IN_LIST, 400)
                }
                break
            }
            case ValidationType.USER_ON_TEAM: {
                const { userId, teamId } = validation.data
                const user = await this.userModel.findById(userId)
                const team = await this.teamModel.findById(teamId)

                if (!team?.players.includes(user?._id)) {
                    throw new ApiError(Constants.PLAYER_NOT_ON_TEAM, 400)
                }

                if (user) {
                    for (const i of user.playerTeams) {
                        if (i._id.equals(team?._id)) {
                            return
                        }
                    }
                }
                throw new ApiError(Constants.PLAYER_NOT_ON_TEAM, 400)
            }
            case ValidationType.USER_ACCEPTING_REQUESTS: {
                const { userId } = validation.data
                const user = await this.userModel.findById(userId)
                if (!user?.openToRequests) {
                    throw new ApiError(Constants.NOT_ACCEPTING_REQUESTS, 400)
                }
                break
            }
            case ValidationType.TEAM_ACCEPTING_REQUESTS: {
                const { teamId } = validation.data
                const team = await this.teamModel.findById(teamId)
                if (!team?.rosterOpen) {
                    throw new ApiError(Constants.NOT_ACCEPTING_REQUESTS, 400)
                }
                break
            }
        }
    }
}
