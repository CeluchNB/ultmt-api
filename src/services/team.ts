import { ITeamModel } from '../models/team'
import { IUserModel } from '../models/user'
import { ApiError, ITeam, ITeamDocument, IUserDocument } from '../types'
import * as Constants from '../utils/constants'
import UltmtValidator from '../utils/ultmt-validator'

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
        await new UltmtValidator(this.userModel, this.teamModel).teamExists(teamId).userIsManager(userId, teamId).test()
        return await this.getTeam(teamId, false)
    }

    /**
     * Method to delete a player from a team
     * @param managerId id of team manager
     * @param teamId id of team
     * @param userId id of user
     * @returns updated team document
     */
    removePlayer = async (managerId: string, teamId: string, userId: string): Promise<ITeamDocument> => {
        const user = await this.userModel.findById(userId)
        if (!user) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        const team = await this.teamModel.findById(teamId)
        if (!team) {
            throw new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404)
        }

        await new UltmtValidator(this.userModel, this.teamModel)
            .userOnTeam(userId, teamId)
            .userIsManager(managerId, teamId)
            .test()

        team.players = team.players.filter((id) => !id.equals(user._id))
        user.playerTeams = user.playerTeams.filter((id) => !id.equals(team._id))

        await team.save()
        await user.save()
        return team
    }
}
