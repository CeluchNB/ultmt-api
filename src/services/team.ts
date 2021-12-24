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

        // TODO:: Perform creation of RosterRequest objects here
        for (const i of team.requests) {
            const requestUser = await this.userModel.findById(i)
            requestUser?.requests.push(teamObject._id)
            await requestUser?.save()
        }

        await teamObject.populate('managerArray')
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
            teamObject.requests = []
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
}
