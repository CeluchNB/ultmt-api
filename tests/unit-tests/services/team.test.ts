import TeamServices from '../../../src/services/team'
import User from '../../../src/models/user'
import Team from '../../../src/models/team'
import { ITeam, IUser } from '../../../src/types'
import { getTeam, getUser } from '../../fixtures/utils'
import { setUpDatabase, saveUsers, tearDownDatabase, resetDatabase } from '../../fixtures/setup-db'

const anonId = '507f191e810c19729de860ea'
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
        expect(teamResponse.requestsFromPlayers.length).toBe(0)
        expect(teamResponse.requestsToPlayers.length).toBe(0)
        expect(teamResponse.managerArray.length).toBe(1)
        expect(teamResponse.requestsToPlayerArray.length).toBe(0)
        expect(teamResponse.requestsFromPlayerArray).toBeUndefined()
        expect(teamResponse.playerArray).toBeUndefined()

        expect(teamRecord?.place).toBe(team.place)
        expect(teamRecord?.name).toBe(team.name)
        expect(teamRecord?.managers.length).toBe(1)
        expect(teamRecord?.managers[0].toString()).toBe(userResponse._id.toString())
        expect(teamRecord?.players.length).toBe(0)
        expect(teamRecord?.seasonStart.toString()).toBe(team.seasonStart.toString())
        expect(teamRecord?.seasonEnd.toString()).toBe(team.seasonEnd.toString())
        expect(teamRecord?.requestsFromPlayers.length).toBe(0)
        expect(teamRecord?.requestsToPlayers.length).toBe(0)

        expect(userRecord?.managerTeams?.length).toBe(1)
        expect(userRecord?.managerTeams?.[0].toString()).toBe(teamResponse._id.toString())
    })

    it('with requested players', async () => {
        await saveUsers()

        const team: ITeam = getTeam()
        const users = await User.find({})
        for (const u of users) {
            team.requestsToPlayers.push(u._id)
        }

        const teamResponse = await services.createTeam(team, users[0])

        expect(teamResponse.place).toBe(team.place)
        expect(teamResponse.name).toBe(team.name)
        expect(teamResponse.requestsToPlayers.length).toBe(3)
        expect(teamResponse.managerArray.length).toBe(1)
        expect(teamResponse.managerArray[0].firstName).toBe(users[0].firstName)
        expect(teamResponse.requestsToPlayerArray.length).toBe(3)
        expect(teamResponse.requestsToPlayerArray[2].firstName).toBe(users[2].firstName)

        for (const u of users) {
            const user = await User.findById(u._id)
            expect(user?.requestsFromTeams?.length).toBe(1)
            expect(user?.requestsFromTeams?.[0].toString()).toBe(teamResponse._id.toString())
        }
    })

    it('with invalid user', async () => {
        const user: IUser = getUser()
        const userRecord = await User.create(user)
        userRecord._id = anonId
        expect(async () => {
            await services.createTeam(getTeam(), userRecord)
        }).rejects.toThrow()
    })
})
