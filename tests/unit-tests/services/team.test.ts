import TeamServices from '../../../src/services/team'
import User from '../../../src/models/user'
import Team from '../../../src/models/team'
import { ApiError, ITeam, IUser } from '../../../src/types'
import { getTeam, getUser, anonId } from '../../fixtures/utils'
import { setUpDatabase, saveUsers, tearDownDatabase, resetDatabase } from '../../fixtures/setup-db'
import * as Constants from '../../../src/utils/constants'

const services = new TeamServices(Team, User)

beforeAll(async () => {
    await setUpDatabase()
})

afterEach(async () => {
    await resetDatabase()
})

afterAll(() => {
    tearDownDatabase()
})

describe('test create team', () => {
    it('with minimal, valid data', async () => {
        const user: IUser = getUser()
        const userResponse = await User.create(user)

        const team: ITeam = getTeam()
        const teamResponse = await services.createTeam(team, userResponse)
        const teamRecord = await Team.findById(teamResponse._id)
        const userRecord = await User.findById(userResponse._id)

        expect(teamResponse.place).toBe(team.place)
        expect(teamResponse.name).toBe(team.name)
        expect(teamResponse.managers.length).toBe(1)
        expect(teamResponse.managers[0].toString()).toBe(userResponse._id.toString())
        expect(teamResponse.players.length).toBe(0)
        expect(teamResponse.seasonStart).toBe(team.seasonStart)
        expect(teamResponse.seasonEnd).toBe(team.seasonEnd)
        expect(teamResponse.requests.length).toBe(0)
        expect(teamResponse.managerArray.length).toBe(1)
        expect(teamResponse.playerArray).toBeUndefined()

        expect(teamRecord?.place).toBe(team.place)
        expect(teamRecord?.name).toBe(team.name)
        expect(teamRecord?.managers.length).toBe(1)
        expect(teamRecord?.managers[0].toString()).toBe(userResponse._id.toString())
        expect(teamRecord?.players.length).toBe(0)
        expect(teamRecord?.seasonStart.toString()).toBe(team.seasonStart.toString())
        expect(teamRecord?.seasonEnd.toString()).toBe(team.seasonEnd.toString())
        expect(teamRecord?.requests.length).toBe(0)

        expect(userRecord?.managerTeams?.length).toBe(1)
        expect(userRecord?.managerTeams?.[0].toString()).toBe(teamResponse._id.toString())
    })

    it('with requested players', async () => {
        await saveUsers()

        const team: ITeam = getTeam()
        const users = await User.find({})
        // TODO: Make these use real request objects
        for (const u of users) {
            team.requests.push(u._id)
        }

        const teamResponse = await services.createTeam(team, users[0])

        expect(teamResponse.place).toBe(team.place)
        expect(teamResponse.name).toBe(team.name)
        expect(teamResponse.requests.length).toBe(3)
        expect(teamResponse.managerArray.length).toBe(1)
        expect(teamResponse.managerArray[0].firstName).toBe(users[0].firstName)

        for (const u of users) {
            const user = await User.findById(u._id)
            expect(user?.requests.length).toBe(1)
            expect(user?.requests[0].toString()).toBe(teamResponse._id.toString())
        }
    })

    it('with invalid user', async () => {
        const user: IUser = getUser()
        const userRecord = await User.create(user)
        userRecord._id = anonId
        await expect(services.createTeam(getTeam(), userRecord)).rejects.toThrow()
    })
})

describe('test getTeam', () => {
    it('with valid id and non-public request', async () => {
        const user: IUser = getUser()
        const team: ITeam = getTeam()

        const userRecord = await User.create(user)
        const teamRecord = await Team.create(team)
        // TODO: Fix to be real roster request ID
        teamRecord.requests.push(userRecord._id)
        await teamRecord.save()

        const teamResponse = await services.getTeam(teamRecord._id, false)
        expect(teamResponse.place).toBe(team.place)
        expect(teamResponse.name).toBe(team.name)
        expect(teamResponse.requests.length).toBe(1)
    })

    it('with valid id and public request', async () => {
        const user: IUser = getUser()
        const team: ITeam = getTeam()

        const userRecord = await User.create(user)
        const teamRecord = await Team.create(team)
        // TODO: fix to be real roster request ID
        teamRecord.requests.push(userRecord._id)
        await teamRecord.save()

        const teamResponse = await services.getTeam(teamRecord._id, true)
        expect(teamResponse.place).toBe(team.place)
        expect(teamResponse.name).toBe(team.name)
        expect(teamResponse.requests.length).toBe(0)
    })

    it('with invalid id', async () => {
        const team: ITeam = getTeam()

        await Team.create(team)

        await expect(services.getTeam(anonId, true)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404),
        )
    })
})

describe('test getManagedTeam', () => {
    it('with valid manager', async () => {
        const user: IUser = getUser()
        const userResponse = await User.create(user)

        const team: ITeam = getTeam()
        team.managers.push(userResponse._id)
        const teamRecord = await Team.create(team)

        userResponse.managerTeams.push(teamRecord._id)
        await userResponse.save()

        const teamResponse = await services.getManagedTeam(teamRecord._id, userResponse._id)
        expect(teamResponse.place).toBe(team.place)
        expect(teamResponse.name).toBe(team.name)
        expect(teamResponse.managers?.length).toBe(1)
    })

    it('with invalid manager', async () => {
        const team: ITeam = getTeam()
        const teamRecord = await Team.create(team)

        const user: IUser = getUser()
        const userRecord = await User.create(user)
        await userRecord.generateAuthToken()

        await expect(services.getManagedTeam(teamRecord._id, anonId)).rejects.toThrowError(
            new ApiError(Constants.UNAUTHORIZED_MANAGER, 401),
        )
    })
})
