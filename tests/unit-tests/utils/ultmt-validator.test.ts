import UltmtValidator from '../../../src/utils/ultmt-validator'
import User from '../../../src/models/user'
import Team from '../../../src/models/team'
import RosterRequest from '../../../src/models/roster-request'
import { setUpDatabase, resetDatabase, tearDownDatabase } from '../../fixtures/setup-db'
import { getUser, getTeam, getRosterRequest, anonId } from '../../fixtures/utils'
import { ApiError, Initiator, Status } from '../../../src/types'
import * as Constants from '../../../src/utils/constants'
import { Types } from 'mongoose'
import { getEmbeddedTeam, getEmbeddedUser } from '../../../src/utils/utils'
import MockDate from 'mockdate'
import ClaimGuestRequest from '../../../src/models/claim-guest-request'

beforeAll(async () => {
    await setUpDatabase()
})

afterEach(async () => {
    await resetDatabase()
})

afterAll((done) => {
    tearDownDatabase()
    done()
})

describe('test ultmt validator', () => {
    it('test with no arguments', async () => {
        const user = await User.create(getUser())

        const validator = new UltmtValidator()
        validator.userExists(user._id.toHexString())
        const result = await validator.test()
        expect(result).toBe(true)
    })

    it('user exists with existing user', async () => {
        const user = await User.create(getUser())

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.userExists(user._id.toHexString())
        const result = await validator.test()
        expect(result).toBe(true)
    })

    it('user exists without existing user', async () => {
        await User.create(getUser())

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.userExists(anonId)
        await expect(validator.test()).rejects.toThrow(new ApiError(Constants.UNABLE_TO_FIND_USER, 404))
    })

    it('team exists with existing team', async () => {
        const team = await Team.create(getTeam())

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.teamExists(team._id.toString())
        const result = await validator.test()
        expect(result).toBe(true)
    })

    it('team exists without existing team', async () => {
        await Team.create(getTeam())

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.teamExists(anonId)
        await expect(validator.test()).rejects.toThrow(new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404))
    })

    it('roster request exists with existing request', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        const request = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Player))

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.requestExists(request._id.toString())
        const result = await validator.test()
        expect(result).toBe(true)
    })

    it('roster request exists without existing request', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Player))

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.requestExists(anonId)
        await expect(validator.test()).rejects.toThrow(new ApiError(Constants.UNABLE_TO_FIND_REQUEST, 404))
    })

    it('user is manager success case', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        team.managers.push(getEmbeddedUser(user))
        await team.save()
        user.managerTeams.push(getEmbeddedTeam(team))
        await user.save()

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.userIsManager(user._id.toHexString(), team._id.toString())
        const result = await validator.test()
        expect(result).toBe(true)
    })

    it('user is manager failure case', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        team.managers.push(getEmbeddedUser(user))
        await team.save()

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.userIsManager(user._id.toHexString(), team._id.toString())
        await expect(validator.test()).rejects.toThrow(new ApiError(Constants.UNAUTHORIZED_MANAGER, 401))
    })

    it('user is manager second failure case', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        user.managerTeams.push(getEmbeddedTeam(team))
        await user.save()

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.userIsManager(user._id.toHexString(), team._id.toString())
        await expect(validator.test()).rejects.toThrow(new ApiError(Constants.UNAUTHORIZED_MANAGER, 401))
    })

    it('request is team initiated success case', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        const request = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Team))

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.requestIsTeamInitiated(request._id.toString())
        const result = await validator.test()
        expect(result).toBe(true)
    })

    it('reqest is team initiated failure case', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        const request = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Player))

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.requestIsTeamInitiated(request._id.toString())
        await expect(validator.test()).rejects.toThrow(new ApiError(Constants.NOT_ALLOWED_TO_RESPOND, 400))
    })

    it('request is user initiated success case', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        const request = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Player))

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.requestIsUserInitiated(request._id.toString())
        const result = await validator.test()
        expect(result).toBe(true)
    })

    it('request is user initiated failure case', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        const request = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Team))

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.requestIsUserInitiated(request._id.toString())
        await expect(validator.test()).rejects.toThrow(new ApiError(Constants.NOT_ALLOWED_TO_RESPOND, 400))
    })

    it('request does not already exist', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.noPendingRequest(user._id.toString(), team._id.toString(), Initiator.Player)
        const result = await validator.test()
        expect(result).toBe(true)
    })

    it('request already exists from team', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Team))

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.noPendingRequest(user._id.toString(), team._id.toString(), Initiator.Team)
        await expect(validator.test()).rejects.toThrow(new ApiError(Constants.TEAM_ALREADY_REQUESTED, 400))
    })

    it('request already exists from player', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Player))

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.noPendingRequest(user._id.toString(), team._id.toString(), Initiator.Player)
        await expect(validator.test()).rejects.toThrow(new ApiError(Constants.PLAYER_ALREADY_REQUESTED, 400))
    })

    it('request already exists from team with player trying requesting', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Team))

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.noPendingRequest(user._id.toString(), team._id.toString(), Initiator.Player)
        await expect(validator.test()).rejects.toThrow(new ApiError(Constants.PLAYER_ALREADY_REQUESTED, 400))
    })

    it('request is pending success case', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        const request = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Player))

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.requestIsPending(request._id.toString())
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
        validator.requestIsPending(request._id.toString())
        await expect(validator.test()).rejects.toThrow(new ApiError(Constants.REQUEST_ALREADY_RESOLVED, 400))
    })

    it('player not on team success case', async () => {
        const user = await User.create(getUser())
        const team = await Team.create(getTeam())

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.userNotOnTeam(user._id.toHexString(), team._id.toString())
        const result = await validator.test()
        expect(result).toBe(true)
    })

    it('player not on team failure on user', async () => {
        const user = await User.create(getUser())
        const team = await Team.create(getTeam())
        user.playerTeams.push(getEmbeddedTeam(team))
        await user.save()

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.userNotOnTeam(user._id.toString(), team._id.toString())
        await expect(validator.test()).rejects.toThrow(new ApiError(Constants.PLAYER_ALREADY_ROSTERED, 400))
    })

    it('player not on team failure on team', async () => {
        const user = await User.create(getUser())
        const team = await Team.create(getTeam())
        team.players.push(getEmbeddedUser(user))
        await team.save()

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.userNotOnTeam(user._id.toString(), team._id.toString())
        await expect(validator.test()).rejects.toThrow(new ApiError(Constants.PLAYER_ALREADY_ROSTERED, 400))
    })

    it('player on request success case', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        const request = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Team))

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.userOnRequest(user._id.toString(), request._id.toString())
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
        validator.userOnRequest(user._id.toString(), request._id.toString())
        await expect(validator.test()).rejects.toThrow(new ApiError(Constants.NOT_ALLOWED_TO_RESPOND, 400))
    })

    it('team contains request success case', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        const request = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Team))
        team.requests.push(request._id)
        await team.save()

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.teamContainsRequest(team._id.toString(), request._id.toString())
        const result = await validator.test()
        expect(result).toBe(true)
    })

    it('team contains request failure case', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        const request = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Team))

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.teamContainsRequest(team._id.toString(), request._id.toString())
        await expect(validator.test()).rejects.toThrow(new ApiError(Constants.REQUEST_NOT_IN_LIST, 400))
    })

    it('user containts request success case', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        const request = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Team))
        user.requests.push(request._id)
        await user.save()

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.userContainsRequest(user._id.toString(), request._id.toString())
        const result = await validator.test()
        expect(result).toBe(true)
    })

    it('user contains request failure case', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        const request = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Team))

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.userContainsRequest(team._id.toString(), request._id.toString())
        await expect(validator.test()).rejects.toThrow(new ApiError(Constants.REQUEST_NOT_IN_LIST, 400))
    })

    it('user on team success case', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        team.players.push(getEmbeddedUser(user))
        await team.save()
        user.playerTeams.push(getEmbeddedTeam(team))
        await user.save()

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.userOnTeam(user._id.toString(), team._id.toString())
        const result = await validator.test()
        expect(result).toBe(true)
    })

    it('user on team failure case', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.userOnTeam(user._id.toString(), team._id.toString())
        await expect(validator.test()).rejects.toThrow(new ApiError(Constants.PLAYER_NOT_ON_TEAM, 404))
    })

    it('user on team second failure case', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        team.players.push(getEmbeddedUser(user))
        await team.save()

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.userOnTeam(user._id.toString(), team._id.toString())
        await expect(validator.test()).rejects.toThrow(new ApiError(Constants.PLAYER_NOT_ON_TEAM, 404))
    })

    it('user accepting requests success case', async () => {
        const user = await User.create(getUser())

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.userAcceptingRequests(user._id.toHexString())
        const result = await validator.test()
        expect(result).toBe(true)
    })

    it('user accepting requests failure case', async () => {
        const user = await User.create(getUser())
        user.openToRequests = false
        await user.save()

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.userAcceptingRequests(user._id.toHexString())
        await expect(validator.test()).rejects.toThrow(new ApiError(Constants.NOT_ACCEPTING_REQUESTS, 400))
    })

    it('team accepting requests success case', async () => {
        const team = await Team.create(getTeam())
        team.rosterOpen = true
        await team.save()

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.teamAcceptingRequests(team._id.toString())
        const result = await validator.test()
        expect(result).toBe(true)
    })

    it('team accepting requests failure case', async () => {
        const team = await Team.create(getTeam())

        const validator = new UltmtValidator(User, Team, RosterRequest)
        validator.teamAcceptingRequests(team._id.toString())
        await expect(validator.test()).rejects.toThrow(new ApiError(Constants.NOT_ACCEPTING_REQUESTS, 400))
    })

    it('enough characters success case', async () => {
        const term = 'que'
        const validator = new UltmtValidator()
        validator.enoughSearchCharacters(term)
        const result = await validator.test()
        expect(result).toBe(true)
    })

    it('enough characters failure case', async () => {
        const term = 'qu'
        const validator = new UltmtValidator()
        validator.enoughSearchCharacters(term)
        await expect(validator.test()).rejects.toThrow(new ApiError(Constants.NOT_ENOUGH_CHARACTERS, 400))
    })

    it('user authorized for request success with user on request', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        const request = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Team))

        const validator = new UltmtValidator()
        validator.userAuthorizedForRequest(user._id.toString(), request._id.toString())
        const result = await validator.test()
        expect(result).toBe(true)
    })

    it('user authorized for request success with team manager', async () => {
        const managerObj = getUser()
        managerObj.firstName = 'Manager'
        managerObj.lastName = 'Last'
        managerObj.email = 'manager@email.com'
        managerObj.username = 'manager'
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        const manager = await User.create(managerObj)
        team.managers.push(getEmbeddedUser(manager))
        await team.save()
        const request = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Team))

        const validator = new UltmtValidator()
        validator.userAuthorizedForRequest(manager._id.toString(), request._id.toString())
        const result = await validator.test()
        expect(result).toBe(true)
    })

    it('user authorized for request with failure case', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        const request = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Team))

        const validator = new UltmtValidator()
        validator.userAuthorizedForRequest(anonId, request._id.toString())
        await expect(validator.test()).rejects.toThrow(new ApiError(Constants.UNAUTHORIZED_TO_VIEW_REQUEST, 404))
    })

    it('test user is not manager success case', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())

        const validator = new UltmtValidator()
        validator.userIsNotManager(user._id.toString(), team._id.toString())
        const result = await validator.test()
        expect(result).toBe(true)
    })

    it('test user is not manager with first failure case', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        team.managers.push(getEmbeddedUser(user))
        await team.save()

        const validator = new UltmtValidator()
        validator.userIsNotManager(user._id.toString(), team._id.toString())
        await expect(validator.test()).rejects.toThrow(new ApiError(Constants.USER_ALREADY_MANAGES_TEAM, 400))
    })

    it('test user is not manager with second failure case', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        user.managerTeams.push(getEmbeddedTeam(team))
        await user.save()

        const validator = new UltmtValidator()
        validator.userIsNotManager(user._id.toString(), team._id.toString())
        await expect(validator.test()).rejects.toThrow(new ApiError(Constants.USER_ALREADY_MANAGES_TEAM, 400))
    })

    it('test user is not manager with missing team', async () => {
        const user = await User.create(getUser())

        const validator = new UltmtValidator()
        validator.userIsNotManager(user._id.toString(), anonId)
        await expect(validator.test()).rejects.toThrow(new ApiError(Constants.UNABLE_TO_FIND_TEAM, 400))
    })

    it('test user is not manager with missing user', async () => {
        const team = await Team.create(getTeam())
        const validator = new UltmtValidator()
        validator.userIsNotManager(anonId, team._id.toString())
        await expect(validator.test()).rejects.toThrow(new ApiError(Constants.UNABLE_TO_FIND_USER, 400))
    })

    it('test valid dates with season start failure case', async () => {
        MockDate.set(new Date('2022'))
        const validator1 = new UltmtValidator()
        validator1.validSeasonDates(new Date('2021'), new Date('2022'))
        await expect(validator1.test()).rejects.toThrow(new ApiError(Constants.INVALID_SEASON_DATE, 400))

        const validator2 = new UltmtValidator()
        validator2.validSeasonDates(new Date('2024'), new Date('2022'))
        await expect(validator2.test()).rejects.toThrow(new ApiError(Constants.INVALID_SEASON_DATE, 400))
        MockDate.reset()
    })

    it('test valid dates with season end failure case', async () => {
        MockDate.set(new Date('2022'))
        const validator1 = new UltmtValidator()
        validator1.validSeasonDates(new Date('2022'), new Date('2021'))
        await expect(validator1.test()).rejects.toThrow(new ApiError(Constants.INVALID_SEASON_DATE, 400))

        const validator2 = new UltmtValidator()
        validator2.validSeasonDates(new Date('2024'), new Date('2022'))
        await expect(validator2.test()).rejects.toThrow(new ApiError(Constants.INVALID_SEASON_DATE, 400))
        MockDate.reset()
    })

    it('test valid dates with season end before season start', async () => {
        MockDate.set(new Date('2022'))
        const validator = new UltmtValidator()
        validator.validSeasonDates(new Date('2023'), new Date('2022'))
        await expect(validator.test()).rejects.toThrow(new ApiError(Constants.INVALID_SEASON_DATE, 400))
        MockDate.reset()
    })

    it('test valid dates with success case', async () => {
        MockDate.set(new Date('2022'))
        const validator = new UltmtValidator()
        validator.validSeasonDates(new Date('2022'), new Date('2022'))
        const result = await validator.test()
        expect(result).toBe(true)
        MockDate.reset()
    })

    it('test admin validation with valid admin', async () => {
        const user = await User.create({ ...getUser(), email: 'noah.celuch@gmail.com' })
        const validator = new UltmtValidator()
        validator.userIsAdmin(user._id.toHexString())

        const result = await validator.test()
        expect(result).toBe(true)
    })

    it('test admin validation with invalid admin', async () => {
        const user = await User.create({ ...getUser() })
        const validator = new UltmtValidator()
        validator.userIsAdmin(user._id.toHexString())

        await expect(validator.test()).rejects.toThrow(Constants.UNAUTHORIZED_ADMIN)
    })

    it('test user is guest with guest user', async () => {
        const user = await User.create({ ...getUser(), guest: true })
        const validator = new UltmtValidator()
        validator.userIsGuest(user._id.toHexString())

        const result = await validator.test()
        expect(result).toBe(true)
    })

    it('test user is guest with non-guest user', async () => {
        const user = await User.create({ ...getUser(), guest: false })
        const validator = new UltmtValidator()
        validator.userIsGuest(user._id.toHexString())

        await expect(validator.test()).rejects.toThrow(Constants.USER_IS_NOT_A_GUEST)
    })

    it('test claim guest request already exists with existing request', async () => {
        const userId = new Types.ObjectId()
        const guestId = new Types.ObjectId()
        const teamId = new Types.ObjectId()

        await ClaimGuestRequest.create({ userId, guestId, teamId })

        const validator = new UltmtValidator()
        validator.claimGuestRequestDoesNotExist(userId.toHexString(), guestId.toHexString(), teamId.toHexString())

        await expect(validator.test()).rejects.toThrow(Constants.CLAIM_GUEST_REQUEST_ALREADY_EXISTS)
    })

    it('test claim guest request exists without existing request', async () => {
        const userId = new Types.ObjectId()
        const guestId = new Types.ObjectId()
        const teamId = new Types.ObjectId()

        const validator = new UltmtValidator()
        validator.claimGuestRequestDoesNotExist(userId.toHexString(), guestId.toHexString(), teamId.toHexString())

        const result = await validator.test()
        expect(result).toBe(true)
    })
})
