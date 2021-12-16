import { ITeamModel } from '../models/team'
import { IUserModel } from '../models/user'
import { ITeam, ITeamDocument, IUserDocument } from '../types'

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
}
