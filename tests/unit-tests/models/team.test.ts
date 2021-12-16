import Team from '../../../src/models/team'
import { ITeam } from '../../../src/types'
import { setUpDatabase, resetDatabase, tearDownDatabase } from '../../fixtures/setup-db'
import { getTeam } from '../../fixtures/utils'

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
        expect(teamRecord.requestingPlayers.length).toBe(0)
        expect(teamRecord.requestedPlayers.length).toBe(0)
        expect(teamRecord.games.length).toBe(0)
    })
})
