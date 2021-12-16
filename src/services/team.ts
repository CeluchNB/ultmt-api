import { ITeamModel } from '../models/team'
import { IUserModel } from '../models/user'
import { ApiError, ITeam, ITeamDocument, IUserDocument } from '../types'
import * as Constants from '../utils/constants'

export default class TeamServices {
    teamModel: ITeamModel
    userModel: IUserModel

    constructor(teamModel: ITeamModel, userModel: IUserModel) {
        this.teamModel = teamModel
        this.userModel = userModel
    }

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
            throw new ApiError(Constants.UNABLE_TO_FIND_TEAM, 400)
        }

        if (publicReq) {
            teamObject.requestsFromPlayers = []
            teamObject.requestsToPlayers = []
        }

        return teamObject
    }
}
