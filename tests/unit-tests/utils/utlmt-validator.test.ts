import UltmtValidator from '../../../src/utils/ultmt-validator'
import User from '../../../src/models/user'
import Team from '../../../src/models/team'
import RosterRequest from '../../../src/models/roster-request'
import { setUpDatabase, resetDatabase, tearDownDatabase } from '../../fixtures/setup-db'
import { getUser, getTeam, getRosterRequest, anonId } from '../../fixtures/utils'
import { ApiError, Initiator } from '../../../src/types'
import * as Constants from '../../../src/utils/constants'

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
})
