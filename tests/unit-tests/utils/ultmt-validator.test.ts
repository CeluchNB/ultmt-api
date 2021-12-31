import UltmtValidator from '../../../src/utils/ultmt-validator'
import User from '../../../src/models/user'
import Team from '../../../src/models/team'
import RosterRequest from '../../../src/models/roster-request'
import { setUpDatabase, resetDatabase, tearDownDatabase } from '../../fixtures/setup-db'
import { getUser, getTeam, getRosterRequest, anonId } from '../../fixtures/utils'
import { ApiError, Initiator, Status } from '../../../src/types'
import * as Constants from '../../../src/utils/constants'
import { Types } from 'mongoose'

beforeAll(async () => {
    await setUpDatabase()
})

afterEach(async () => {
    await resetDatabase()
})

afterAll(() => {
    tearDownDatabase()
})

describe('test ultmt validator', () => {
    it('test with no arguments', async () => {
        const user = await User.create(getUser())

        const validator = new UltmtValidator()
        validator.userExists(user._id)
        const result = await validator.test()
        expect(result).toBe(true)
    })

    it('user exists with existing user', async () => {
        const user = await User.create(getUser())

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.userExists(user._id)
        const result = await validator.test()
        expect(result).toBe(true)
    })

    it('user exists without existing user', async () => {
        await User.create(getUser())

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.userExists(anonId)
        await expect(validator.test()).rejects.toThrowError(new ApiError(Constants.UNABLE_TO_FIND_USER, 404))
    })

    it('team exists with existing team', async () => {
        const team = await Team.create(getTeam())

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.teamExists(team._id)
        const result = await validator.test()
        expect(result).toBe(true)
    })

    it('team exists without existing team', async () => {
        await Team.create(getTeam())

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.teamExists(anonId)
        await expect(validator.test()).rejects.toThrowError(new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404))
    })

    it('roster request exists with existing request', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        const request = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Player))

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.requestExists(request._id)
        const result = await validator.test()
        expect(result).toBe(true)
    })

    it('roster request exists without existing request', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Player))

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.requestExists(anonId)
        await expect(validator.test()).rejects.toThrowError(new ApiError(Constants.UNABLE_TO_FIND_REQUEST, 404))
    })

    it('user is manager success case', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        team.managers.push(user._id)
        await team.save()
        user.managerTeams.push(team._id)
        await user.save()

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.userIsManager(user._id, team._id)
        const result = await validator.test()
        expect(result).toBe(true)
    })

    it('user is manager failure case', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        team.managers.push(user._id)
        await team.save()

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.userIsManager(user._id, team._id)
        await expect(validator.test()).rejects.toThrowError(new ApiError(Constants.UNAUTHORIZED_MANAGER, 401))
    })

    it('request is team initiated success case', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        const request = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Team))

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.requestIsTeamInitiated(request._id)
        const result = await validator.test()
        expect(result).toBe(true)
    })

    it('reqest is team initiated failure case', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        const request = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Player))

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.requestIsTeamInitiated(request._id)
        await expect(validator.test()).rejects.toThrowError(new ApiError(Constants.NOT_ALLOWED_TO_RESPOND, 400))
    })

    it('request is user initiated success case', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        const request = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Player))

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.requestIsUserInitiated(request._id)
        const result = await validator.test()
        expect(result).toBe(true)
    })

    it('request is user initiated failure case', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        const request = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Team))

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.requestIsUserInitiated(request._id)
        await expect(validator.test()).rejects.toThrowError(new ApiError(Constants.NOT_ALLOWED_TO_RESPOND, 400))
    })

    it('request does not already exist', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.noPendingRequest(user._id, team._id, Initiator.Player)
        const result = await validator.test()
        expect(result).toBe(true)
    })

    it('request already exists from team', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Team))

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.noPendingRequest(user._id, team._id, Initiator.Team)
        await expect(validator.test()).rejects.toThrowError(new ApiError(Constants.TEAM_ALREADY_REQUESTED, 400))
    })

    it('request already exists from player', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Player))

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.noPendingRequest(user._id, team._id, Initiator.Player)
        await expect(validator.test()).rejects.toThrowError(new ApiError(Constants.PLAYER_ALREADY_REQUESTED, 400))
    })

    it('request is pending success case', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        const request = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Player))

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.requestIsPending(request._id)
        const result = await validator.test()
        expect(result).toBe(true)
    })

    it('request is pending failure case', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        const request = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Player))
        request.status = Status.Approved
        await request.save()

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.requestIsPending(request._id)
        await expect(validator.test()).rejects.toThrowError(new ApiError(Constants.REQUEST_ALREADY_RESOLVED, 400))
    })

    it('player not on team success case', async () => {
        const user = await User.create(getUser())
        const team = await Team.create(getTeam())

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.userNotOnTeam(user._id, team._id)
        const result = await validator.test()
        expect(result).toBe(true)
    })

    it('player not on team failure on user', async () => {
        const user = await User.create(getUser())
        const team = await Team.create(getTeam())
        user.playerTeams.push(team._id)
        await user.save()

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.userNotOnTeam(user._id, team._id)
        await expect(validator.test()).rejects.toThrowError(new ApiError(Constants.PLAYER_ALREADY_ROSTERED, 400))
    })

    it('player not on team failure on team', async () => {
        const user = await User.create(getUser())
        const team = await Team.create(getTeam())
        team.players.push(user._id)
        await team.save()

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.userNotOnTeam(user._id, team._id)
        await expect(validator.test()).rejects.toThrowError(new ApiError(Constants.PLAYER_ALREADY_ROSTERED, 400))
    })

    it('player on request success case', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        const request = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Team))

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.userOnRequest(user._id, request._id)
        const result = await validator.test()
        expect(result).toBe(true)
    })

    it('player on request failure case', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        const request = await RosterRequest.create(
            getRosterRequest(team._id, new Types.ObjectId(anonId), Initiator.Team),
        )

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.userOnRequest(user._id, request._id)
        await expect(validator.test()).rejects.toThrowError(new ApiError(Constants.NOT_ALLOWED_TO_RESPOND, 400))
    })
})