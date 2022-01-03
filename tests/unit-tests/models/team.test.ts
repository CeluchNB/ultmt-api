import Team from '../../../src/models/team'
import User from '../../../src/models/user'
import { ITeam, IUser } from '../../../src/types'
import { setUpDatabase, resetDatabase, tearDownDatabase } from '../../fixtures/setup-db'
import { getTeam, getUser } from '../../fixtures/utils'

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

describe('test team model', () => {
    it('save with valid data', async () => {
        const team: ITeam = getTeam()
        const teamRecord = await Team.create(team)

        expect(teamRecord.place).toBe(team.place)
        expect(teamRecord.name).toBe(team.name)
        expect(teamRecord.managers.length).toBe(team.managers.length)
        expect(teamRecord.players.length).toBe(team.players.length)
        expect(teamRecord.seasonStart).toBe(team.seasonStart)
        expect(teamRecord.seasonEnd).toBe(team.seasonEnd)
        expect(teamRecord.seasonNumber).toBe(1)
        expect(teamRecord.continuationId).toBeDefined()
        expect(teamRecord.requests.length).toBe(0)
        expect(teamRecord.games.length).toBe(0)
    })

    it('test managerArray virtual', async () => {
        const user: IUser = getUser()
        const userRecord = await User.create(user)

        const team: ITeam = getTeam()
        team.managers.push(userRecord._id)

        const teamRecord = await Team.create(team)
        await teamRecord.populate('managerArray')

        expect(teamRecord.managerArray.length).toBe(1)
        expect(teamRecord.managerArray[0].firstName).toBe(user.firstName)
        expect(teamRecord.managerArray[0].lastName).toBe(user.lastName)
    })

    it('test playerArray virtual', async () => {
        const user: IUser = getUser()
        const userRecord = await User.create(user)

        const team: ITeam = getTeam()
        team.players.push(userRecord._id)

        const teamRecord = await Team.create(team)
        await teamRecord.populate('playerArray')

        expect(teamRecord.playerArray.length).toBe(1)
        expect(teamRecord.playerArray[0].firstName).toBe(user.firstName)
        expect(teamRecord.playerArray[0].lastName).toBe(user.lastName)
    })
})
