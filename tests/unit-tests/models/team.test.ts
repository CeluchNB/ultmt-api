import * as Constants from '../../../src/utils/constants'
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
        expect(teamRecord.seasonNumber).toBe(1)
        expect(teamRecord.continuationId).toBeDefined()
        expect(teamRecord.requests.length).toBe(0)
        expect(teamRecord.games.length).toBe(0)
    })

    it('test save with invalid team name', async () => {
        const team1: ITeam = getTeam()
        team1.teamname = 'N0n-Alph^'
        await expect(Team.create(team1)).rejects.toThrowError(Constants.NON_ALPHANUM_TEAM_NAME)
    })

    it('test save with duplicate team name', async () => {
        const team1: ITeam = getTeam()
        await Team.create(team1)
        await expect(Team.create(team1)).rejects.toThrowError(Constants.DUPLICATE_TEAM_NAME)
    })
})
