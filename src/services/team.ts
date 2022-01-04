import { ITeamModel } from '../models/team'
import { IUserModel } from '../models/user'
import { IArchiveTeamModel } from '../models/archive-team'
import { ApiError, ITeam, IUserDocument } from '../types'
import * as Constants from '../utils/constants'
import UltmtValidator from '../utils/ultmt-validator'
import { Types } from 'mongoose'

export default class TeamServices {
    teamModel: ITeamModel
    userModel: IUserModel
    archiveTeamModel: IArchiveTeamModel

    constructor(teamModel: ITeamModel, userModel: IUserModel, archiveTeamModel: IArchiveTeamModel) {
        this.teamModel = teamModel
        this.userModel = userModel
        this.archiveTeamModel = archiveTeamModel
    }

    /**
     * Creates a team
     * @param team team to create
     * @param user user that is the manager
     * @returns the created team
     */
    createTeam = async (team: ITeam, user: IUserDocument): Promise<ITeam> => {
        team._id = new Types.ObjectId()
        team.seasonStart = new Date(team.seasonStart)
        team.seasonEnd = new Date(team.seasonEnd)
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

        return teamObject
    }

    /**
     * Method to get details of a team
     * @param id id of team to get
     * @param publicReq server side determination of if this is going to a public user or a manager
     * @returns team document object
     */
    getTeam = async (id: string, publicReq: boolean): Promise<ITeam> => {
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
    getManagedTeam = async (teamId: string, userId: string): Promise<ITeam> => {
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
    removePlayer = async (managerId: string, teamId: string, userId: string): Promise<ITeam> => {
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

    /**
     *
     * @param managerId id of manager requesting rollover
     * @param teamId id of team to rollover
     * @param copyPlayers boolean to copy current players over or delete them
     * @param seasonStart new season start
     * @param seasonEnd new season end
     * @returns new team document
     */
    rollover = async (
        managerId: string,
        teamId: string,
        copyPlayers: boolean,
        seasonStart: Date,
        seasonEnd: Date,
    ): Promise<ITeam> => {
        const manager = await this.userModel.findById(managerId)
        if (!manager) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        const team = await this.teamModel.findById(teamId)
        if (!team) {
            throw new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404)
        }

        if (seasonStart.getFullYear() < team.seasonEnd.getFullYear()) {
            throw new ApiError(Constants.SEASON_START_ERROR, 400)
        }

        await new UltmtValidator(this.userModel, this.teamModel).userIsManager(managerId, teamId).test()

        // close roster for archive and new team
        team.rosterOpen = false
        await this.archiveTeamModel.insertMany([team])

        // store needed values
        const oldId = team._id
        const players = team.players

        // update team document and delete old one
        team.isNew = true
        team._id = new Types.ObjectId()
        if (!copyPlayers) {
            team.players = []
        }
        team.seasonStart = seasonStart
        team.seasonEnd = seasonEnd
        team.seasonNumber++

        await team.save()
        await this.teamModel.deleteOne({ _id: oldId })

        // update team of managers
        for (const i of team.managers) {
            const managerRecord = await this.userModel.findById(i)
            if (managerRecord) {
                managerRecord.managerTeams = managerRecord.managerTeams.filter((id) => !id.equals(oldId))
                managerRecord.managerTeams.push(team._id)
                await managerRecord.save()
            }
        }

        // update manager of teams
        for (const i of players) {
            const playerRecord = await this.userModel.findById(i)
            if (playerRecord) {
                playerRecord.playerTeams = playerRecord.playerTeams.filter((id) => !id.equals(oldId))
                if (copyPlayers) {
                    playerRecord.playerTeams.push(team._id)
                }
                await playerRecord.save()
            }
        }

        return team
    }

    /**
     * Method to set team roster open status
     * @param managerId id of manager
     * @param teamId id of team
     * @param open boolean for open
     * @returns updated team document
     */
    setRosterOpen = async (managerId: string, teamId: string, open: boolean): Promise<ITeam> => {
        const manager = await this.userModel.findById(managerId)
        if (!manager) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        const team = await this.teamModel.findById(teamId)
        if (!team) {
            throw new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404)
        }

        await new UltmtValidator(this.userModel, this.teamModel).userIsManager(managerId, teamId).test()

        team.rosterOpen = open
        await team.save()

        return team
    }
}
