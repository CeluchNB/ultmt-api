import User from '../../../src/models/user'
import { ITeam } from '../../../src/types'
import { setUpDatabase, resetDatabase, tearDownDatabase } from '../../fixtures/setup-db'
import { getTeam, getUser } from '../../fixtures/utils'
import ArchiveTeam from '../../../src/models/archive-team'

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

describe('test archive team model', () => {
    it('with valid data', async () => {
        const team: ITeam = getTeam()
        const user = getUser()
        const userRecord = await User.create(user)
        team.managers.push(userRecord._id)

        const archiveTeam = await ArchiveTeam.create(team)

        expect(archiveTeam._id).toBeDefined()
        expect(archiveTeam.place).toBe(team.place)
        expect(archiveTeam.name).toBe(team.name)
        expect(archiveTeam.managers.length).toBe(team.managers.length)
        expect(archiveTeam.players.length).toBe(team.players.length)
        expect(archiveTeam.seasonStart).toBe(team.seasonStart)
        expect(archiveTeam.seasonEnd).toBe(team.seasonEnd)
        expect(archiveTeam.seasonNumber).toBe(team.seasonNumber)
        expect(archiveTeam.continuationId).toBeDefined()
        expect(archiveTeam.continuationId.toString()).not.toBe(archiveTeam._id.toString())
        expect(archiveTeam.rosterOpen).toBe(team.rosterOpen)
        expect(archiveTeam.requests.length).toBe(team.requests.length)
        expect(archiveTeam.games.length).toBe(team.games.length)
    })
})
