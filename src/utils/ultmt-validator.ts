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

    test = async (): Promise<boolean> => {
        for (const i of this.validations) {
            await this.performCheck(i)
        }
        return true
    }

    private performCheck = async (validation: Validation) => {
        switch (validation.type) {
            case ValidationType.USER_EXISTS:
                const user1 = await this.userModel.findById(validation.data.id)
                if (!user1) {
                    throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
                }
                break
            case ValidationType.TEAM_EXISTS:
                const team1 = await this.teamModel.findById(validation.data.id)
                if (!team1) {
                    throw new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404)
                }
                break
            case ValidationType.REQUEST_EXISTS:
                const request1 = await this.rosterRequestModel.findById(validation.data.id)
                if (!request1) {
                    throw new ApiError(Constants.UNABLE_TO_FIND_REQUEST, 404)
                }
                break
            case ValidationType.USER_IS_MANAGER:
                const manager = await this.userModel.findById(validation.data.userId)
                const managingTeam = await this.teamModel.findById(validation.data.teamId)

                if (
                    !managingTeam?.managers.includes(manager?._id) ||
                    !manager?.managerTeams.includes(managingTeam?._id)
                ) {
                    throw new ApiError(Constants.UNAUTHORIZED_MANAGER, 401)
                }
                break
            case ValidationType.REQUEST_IS_TEAM_INITIATED:
                const request2 = await this.rosterRequestModel.findById(validation.data.id)
                if (request2?.requestSource !== Initiator.Team) {
                    throw new ApiError(Constants.NOT_ALLOWED_TO_RESPOND, 400)
                }
                break
            case ValidationType.REQUEST_IS_USER_INITIATED:
                const request3 = await this.rosterRequestModel.findById(validation.data.id)
                if (request3?.requestSource !== Initiator.Player) {
                    throw new ApiError(Constants.NOT_ALLOWED_TO_RESPOND, 400)
                }
                break
            case ValidationType.NO_PENDING_REQUEST:
                const { userId: userId1, teamId: teamId1, source: source1 } = validation.data
                const request4 = await this.rosterRequestModel.findOne({
                    user: new Types.ObjectId(userId1),
                    team: new Types.ObjectId(teamId1),
                    requestSource: source1,
                    status: Status.Pending,
                })

                if (request4) {
                    if (source1 === Initiator.Team) {
                        throw new ApiError(Constants.TEAM_ALREADY_REQUESTED, 400)
                    } else {
                        throw new ApiError(Constants.PLAYER_ALREADY_REQUESTED, 400)
                    }
                }
                break
            case ValidationType.REQUEST_IS_PENDING:
                const request5 = await this.rosterRequestModel.findById(validation.data.id)
                if (request5?.status !== Status.Pending) {
                    throw new ApiError(Constants.REQUEST_ALREADY_RESOLVED, 400)
                }
                break
            case ValidationType.PLAYER_NOT_ON_TEAM:
                const { userId: userId2, teamId: teamId2 } = validation.data
                const user2 = await this.userModel.findById(userId2)
                const team2 = await this.teamModel.findById(teamId2)

                if (user2?.playerTeams.includes(team2?._id) || team2?.players.includes(user2?._id)) {
                    throw new ApiError(Constants.PLAYER_ALREADY_ROSTERED, 400)
                }
                break
            case ValidationType.USER_ON_REQUEST:
                const { userId: userId3, requestId: requestId1 } = validation.data
                const request6 = await this.rosterRequestModel.findById(requestId1)
                const user3 = await this.userModel.findById(userId3)

                if (!request6?.user.equals(user3?._id)) {
                    throw new ApiError(Constants.NOT_ALLOWED_TO_RESPOND, 400)
                }
                break
            case ValidationType.TEAM_CONTAINS_REQUEST:
                const { teamId: teamId3, requestId: requestId2 } = validation.data

                const team3 = await this.teamModel.findById(teamId3)

                if (!team3?.requests.includes(new Types.ObjectId(requestId2))) {
                    throw new ApiError(Constants.REQUEST_NOT_IN_LIST, 400)
                }
                break
        }
    }
}
