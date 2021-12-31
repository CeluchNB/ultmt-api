import { IUserModel } from '../models/user'
import { ITeamModel } from '../models/team'
import { IRosterRequestModel } from '../models/roster-request'
import { ApiError, Initiator } from '../types'
import * as Constants from './constants'

enum ValidationType {
    USER_EXISTS,
    TEAM_EXISTS,
    REQUEST_EXISTS,
    USER_IS_MANAGER,
    REQUEST_IS_TEAM_INITIATED,
    REQUEST_IS_USER_INITIATED,
}

type Validation = {
    type: ValidationType
    data: any
}

export default class UltmtValidator {
    userModel: IUserModel
    teamModel: ITeamModel
    rosterRequestModel: IRosterRequestModel
    validations: Validation[] = []

    constructor(userModel: IUserModel, teamModel: ITeamModel, rosterRequestModel: IRosterRequestModel) {
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

    test = async (): Promise<boolean> => {
        for (const i of this.validations) {
            await this.performCheck(i)
        }
        return true
    }

    private performCheck = async (validation: Validation) => {
        switch (validation.type) {
            case ValidationType.USER_EXISTS:
                const user = await this.userModel.findById(validation.data.id)
                if (!user) {
                    throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
                }
                break
            case ValidationType.TEAM_EXISTS:
                const team = await this.teamModel.findById(validation.data.id)
                if (!team) {
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
        }
    }
}
