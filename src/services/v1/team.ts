import { ITeamModel } from '../../models/team'
import { IUserModel, isValidPassword } from '../../models/user'
import { IRosterRequestModel } from '../../models/roster-request'
import { IArchiveTeamModel } from '../../models/archive-team'
import { ApiError, CreateTeam, ITeam, OTPReason } from '../../types'
import * as Constants from '../../utils/constants'
import UltmtValidator from '../../utils/ultmt-validator'
import { FilterQuery, Types } from 'mongoose'
import { getEmbeddedTeam, getEmbeddedUser } from '../../utils/utils'
import levenshtein from 'js-levenshtein'
import OneTimePasscode, { IOneTimePasscodeModel } from '../../models/one-time-passcode'
import randomstring from 'randomstring'

interface LevenshteinTeam {
    team: ITeam
    distance: number
}

export default class TeamServices {
    teamModel: ITeamModel
    userModel: IUserModel
    requestModel: IRosterRequestModel
    archiveTeamModel: IArchiveTeamModel
    otpModel: IOneTimePasscodeModel

    constructor(
        teamModel: ITeamModel,
        userModel: IUserModel,
        requestModel: IRosterRequestModel,
        archiveTeamModel: IArchiveTeamModel,
        otpModel: IOneTimePasscodeModel = OneTimePasscode,
    ) {
        this.teamModel = teamModel
        this.userModel = userModel
        this.requestModel = requestModel
        this.archiveTeamModel = archiveTeamModel
        this.otpModel = otpModel
    }

    /**
     * Creates a team
     * @param team team to create
     * @param user user that is the manager
     * @returns the created team
     */
    createTeam = async (team: CreateTeam, userId: string): Promise<ITeam> => {
        const seasonStart = new Date(team.seasonStart)
        const seasonEnd = new Date(team.seasonEnd)

        await new UltmtValidator().validSeasonDates(seasonStart, seasonEnd).test()

        const saveTeam: ITeam = {
            _id: new Types.ObjectId(),
            place: team.place,
            name: team.name,
            teamname: team.teamname,
            designation: team.designation,
            seasonStart,
            seasonEnd,
            continuationId: new Types.ObjectId(),
            managers: [],
            players: [],
            seasonNumber: 1,
            rosterOpen: true,
            requests: [],
            verified: false,
        }

        saveTeam.continuationId = saveTeam._id
        const teamObject = await this.teamModel.create(saveTeam)

        const user = await this.userModel.findById(userId)
        if (!user) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }
        user?.managerTeams?.push(getEmbeddedTeam(teamObject))
        await user?.save()

        teamObject.managers.push(getEmbeddedUser(user))
        await teamObject.save()

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

        team.players = team.players.filter((player) => !player._id.equals(user._id))
        user.playerTeams = user.playerTeams.filter((pTeam) => !pTeam._id.equals(team._id))

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

        await new UltmtValidator(this.userModel, this.teamModel)
            .userIsManager(managerId, teamId)
            .validSeasonDates(seasonStart, seasonEnd)
            .test()

        // close roster for archive and new team
        team.rosterOpen = false
        await this.archiveTeamModel.insertMany([team])

        // store needed values
        const oldId = team._id
        const players = team.players
        const oldSeasonStart = team.seasonStart
        const oldSeasonEnd = team.seasonEnd

        // update team document and delete old one
        team.isNew = true
        team._id = new Types.ObjectId()
        if (!copyPlayers) {
            team.players = []
        }
        team.seasonStart = seasonStart
        team.seasonEnd = seasonEnd
        team.seasonNumber++

        // Delete any requests related to the team
        for (const id of team.requests) {
            const request = await this.requestModel.findById(id)
            if (!request) {
                continue
            }
            const user = await this.userModel.findById(request.user)
            if (!user) {
                continue
            }

            user.requests = user.requests.filter((reqId) => !reqId.equals(id))
            await user.save()
            await request.deleteOne()
        }

        team.requests = []

        await this.teamModel.deleteOne({ _id: oldId })
        await team.save()

        // update managers
        const embeddedTeam = getEmbeddedTeam(team)
        embeddedTeam._id = oldId
        embeddedTeam.seasonStart = oldSeasonStart
        embeddedTeam.seasonEnd = oldSeasonEnd

        for (const i of team.managers) {
            const managerRecord = await this.userModel.findById(i)
            if (managerRecord) {
                managerRecord.managerTeams = managerRecord.managerTeams.filter((mTeam) => !mTeam._id.equals(oldId))

                if (managerRecord.archiveTeams.find((at) => at._id.equals(oldId)) === undefined) {
                    managerRecord.archiveTeams.push(embeddedTeam)
                }

                managerRecord.managerTeams.push(getEmbeddedTeam(team))
                await managerRecord.save()
            }
        }

        // update players
        for (const i of players) {
            const playerRecord = await this.userModel.findById(i)
            if (playerRecord) {
                playerRecord.playerTeams = playerRecord.playerTeams.filter((pTeam) => !pTeam._id.equals(oldId))
                if (playerRecord.archiveTeams.find((at) => at._id.equals(oldId)) === undefined) {
                    playerRecord.archiveTeams.push(embeddedTeam)
                }
                if (copyPlayers) {
                    playerRecord.playerTeams.push(getEmbeddedTeam(team))
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

    /**
     * Method to search for a team by place and/or name.  Functionality attempts to provide
     * good search results for reasonable search queries
     * @param term search term
     * @returns array of team objects matching
     */
    search = async (term: string, rosterOpen?: boolean): Promise<ITeam[]> => {
        await new UltmtValidator().enoughSearchCharacters(term).test()
        // If the search term contains a space, we create a matrix of [place, name] x [split terms]
        // to test in the find method's $or parameter
        const terms = term.split(' ')
        const regexes = terms.map((t) => {
            if (t.length >= 3) {
                return new RegExp(`^${t}`, 'i')
            }
        })

        const tests = []
        for (const r of regexes) {
            if (r) {
                tests.push({ place: { $regex: r } })
                tests.push({ name: { $regex: r } })
                tests.push({ teamname: { $regex: r } })
            }
        }

        const filter: FilterQuery<ITeam> = { $or: tests }
        if (rosterOpen !== undefined) {
            filter.rosterOpen = rosterOpen
        }

        const teams = await this.teamModel.find(filter)

        // if the search term contains a space, we perform a simple ranking based on the
        // levenshtein distance between the original term and the full name of the team
        // i.e. "<place> <name>""
        if (terms.length >= 2 && teams.length > 1) {
            const levenshteinTeams: LevenshteinTeam[] = teams.map((t) => {
                return { team: t, distance: levenshtein(term, `${t.place} ${t.name}`) + levenshtein(term, t.teamname) }
            })
            levenshteinTeams.sort((a, b) => {
                return a.distance - b.distance
            })
            // return
            return levenshteinTeams.map((lt) => lt.team)
        }

        return teams
    }

    /**
     * Method to add a manager to a team. New manager must be accepting requests to be added as a manager.
     * @param currentManagerId ID of manager making the request
     * @param newManagerId ID of user to make a manager of the team
     * @param teamId ID of team to add manager to
     * @returns Updated team
     */
    addManager = async (currentManagerId: string, newManagerId: string, teamId: string): Promise<ITeam> => {
        const team = await this.teamModel.findById(teamId)
        if (!team) {
            throw new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404)
        }

        const newManager = await this.userModel.findById(newManagerId)
        if (!newManager) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        await new UltmtValidator(this.userModel, this.teamModel)
            .userIsManager(currentManagerId, teamId)
            .userIsNotManager(newManagerId, teamId)
            .userAcceptingRequests(newManagerId)
            .test()

        const embeddedManager = getEmbeddedUser(newManager)
        team.managers.push(embeddedManager)

        const embeddedTeam = getEmbeddedTeam(team)
        newManager.managerTeams.push(embeddedTeam)

        await team.save()
        await newManager.save()

        return team
    }

    /**
     * Method to get archived team
     * @param id id of team to get
     * @returns archived team
     */
    getArchivedTeam = async (id: string): Promise<ITeam> => {
        const team = await this.archiveTeamModel.findById(id)
        if (!team) {
            throw new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404)
        }

        return team
    }

    /**
     * Method to create an OTP to allow users to join a team in bulk.
     * @param managerId manager of team
     * @param teamId team to attach OTP to
     * @returns OTP
     */
    createBulkJoinCode = async (managerId: string, teamId: string): Promise<string> => {
        const team = await this.teamModel.findById(teamId)
        if (!team) {
            throw new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404)
        }

        const manager = await this.userModel.findById(managerId)
        if (!manager) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        await new UltmtValidator().userIsManager(managerId, teamId).test()

        const expiresAt = new Date()
        expiresAt.setUTCDate(expiresAt.getUTCDate() + 1)
        const otp = await this.otpModel.create({
            creator: manager._id,
            team: team._id,
            reason: OTPReason.TeamJoin,
            expiresAt,
        })

        return otp.passcode
    }

    /**
     * Method to allow a team to change it's designation. If the team is verified this will trigger
     * a new verification request.
     * @param teamId id of team to change designation for
     * @param designationId new designation id
     */
    changeDesignation = async (managerId: string, teamId: string, designationId: string): Promise<ITeam> => {
        const manager = await this.userModel.findById(managerId)
        if (!manager) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        const team = await this.teamModel.findById(teamId)
        if (!team) {
            throw new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404)
        }

        await new UltmtValidator(this.userModel, this.teamModel).userIsManager(managerId, teamId).test()

        team.designation = new Types.ObjectId(designationId)
        await team.save()

        return team
    }

    /**
     * Method to fully delete a team.
     *
     * @param managerId id of manager deleting team. Must be the only manager left on the team.
     * @param teamId id of team to delete
     */
    deleteTeam = async (managerId: string, teamId: string) => {
        const manager = await this.userModel.findById(managerId)
        if (!manager) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        const team = await this.teamModel.findById(teamId)
        if (!team) {
            throw new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404)
        }

        await new UltmtValidator(this.userModel, this.teamModel).userIsManager(managerId, teamId).test()

        if (team.managers.length > 1) {
            throw new ApiError(Constants.UNAUTHORIZED_MANAGER, 401)
        }

        await this.userModel.updateMany(
            { _id: { $in: team.players.map((p) => p._id) } },
            {
                $pull: {
                    playerTeams: { _id: team._id },
                },
            },
        )

        manager.managerTeams = manager.managerTeams.filter((mTeam) => !mTeam._id.equals(team._id))
        await manager.save()

        await team.deleteOne()
    }

    /**
     * Method to archive a team without rolling it over.
     *
     * @param managerId id of manager making the call
     * @param teamId id of team to archive
     * @returns archive team record
     */
    archiveTeam = async (managerId: string, teamId: string): Promise<ITeam> => {
        const manager = await this.userModel.findById(managerId)
        if (!manager) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        const team = await this.teamModel.findById(teamId)
        if (!team) {
            throw new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404)
        }

        await new UltmtValidator(this.userModel, this.teamModel).userIsManager(managerId, teamId).test()

        // close roster for archive and new team
        const oldId = team._id
        const players = team.players

        team.rosterOpen = false

        // Delete any requests related to the team
        for (const id of team.requests) {
            const request = await this.requestModel.findById(id)
            if (!request) {
                continue
            }
            const user = await this.userModel.findById(request.user)
            if (!user) {
                continue
            }

            user.requests = user.requests.filter((reqId) => !reqId.equals(id))
            await user.save()
            await request.deleteOne()
        }

        team.requests = []

        const result = await this.archiveTeamModel.insertMany([team])
        const archiveTeam = result[0]

        await this.teamModel.deleteOne({ _id: oldId })

        // update managers
        const embeddedTeam = getEmbeddedTeam(archiveTeam)
        for (const i of team.managers) {
            const managerRecord = await this.userModel.findById(i)
            if (managerRecord) {
                managerRecord.managerTeams = managerRecord.managerTeams.filter((mTeam) => !mTeam._id.equals(oldId))
                managerRecord.archiveTeams.push(embeddedTeam)
                await managerRecord.save()
            }
        }

        // update players
        for (const i of players) {
            const playerRecord = await this.userModel.findById(i)
            if (playerRecord) {
                playerRecord.playerTeams = playerRecord.playerTeams.filter((pTeam) => !pTeam._id.equals(oldId))
                playerRecord.archiveTeams.push(embeddedTeam)
                await playerRecord.save()
            }
        }

        return archiveTeam
    }

    /**
     * Method to check if a teamname has been taken
     * @param teamname teamname to check
     * @returns boolean
     */
    teamnameTaken = async (teamname?: string): Promise<boolean> => {
        if (!teamname || teamname.length < 2) {
            throw new ApiError(Constants.DUPLICATE_TEAM_NAME, 400)
        }

        const teams = await this.teamModel.find({ teamname })

        return teams.length > 0
    }

    /**
     * Method to create a guest user for a team
     * @param teamId id of team for guest
     * @param managerId id of manager making edits
     * @param firstName first name of guest
     * @param lastName last name of guest
     * @returns
     */
    addGuest = async (teamId: string, managerId: string, firstName: string, lastName: string): Promise<ITeam> => {
        const team = await this.teamModel.findById(teamId)
        if (!team) {
            throw new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404)
        }

        const manager = await this.userModel.findById(managerId)
        if (!manager) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }
        await new UltmtValidator(this.userModel, this.teamModel).userIsManager(managerId, teamId).test()

        const _id = new Types.ObjectId()
        const username = `guest${Date.now()}`
        const email = `${username}@theultmtapp.com`
        let password = ''

        while (!isValidPassword(password)) {
            password = randomstring.generate({ charset: 'a-zA-Z0-9!@#$%', length: 15 })
        }

        const user = await this.userModel.create({
            _id,
            firstName,
            lastName,
            username,
            email,
            password,
            guest: true,
            playerTeams: [getEmbeddedTeam(team)],
        })

        team.players.push(getEmbeddedUser(user))
        await team.save()

        return team
    }
}
