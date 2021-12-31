import { IRosterRequest, Status, Initiator } from '../../../src/types'
import RosterRequest from '../../../src/models/roster-request'
import User from '../../../src/models/user'
import Team from '../../../src/models/team'
import { getUser, getTeam } from '../../fixtures/utils'
import { setUpDatabase, resetDatabase, tearDownDatabase } from '../../fixtures/setup-db'

beforeAll(async () => {
    await setUpDatabase()
})

afterEach(async () => {
    await resetDatabase()
})

afterAll(() => {
    tearDownDatabase()
})

describe('test roster request model', () => {
    it('with valid data', async () => {
        const user = await User.create(getUser())
        const team = await Team.create(getTeam())

        const rosterRequest: IRosterRequest = {
            user: user._id,
            team: team._id,
            requestSource: Initiator.Player,
            status: Status.Pending,
        }

        const result = await RosterRequest.create(rosterRequest)
        expect(result.user.toString()).toBe(user._id.toString())
        expect(result.team.toString()).toBe(team._id.toString())
        expect(result.requestSource).toBe(Initiator.Player)
        expect(result.status).toBe(Status.Pending)

        const record = await RosterRequest.findById(result._id)
        expect(record?.user.toString()).toBe(user._id.toString())
        expect(record?.team.toString()).toBe(team._id.toString())
        expect(record?.requestSource).toBe(Initiator.Player)
        expect(record?.status).toBe(Status.Pending)
    })

    it('with invalid data', async () => {
        const user = await User.create(getUser())
        const team = await Team.create(getTeam())
        const rosterRequest = {
            user: user._id,
            team: team._id,
            requestSource: 4,
            status: 4,
        }

        await expect(async () => {
            await RosterRequest.create(rosterRequest)
        }).rejects.toThrow()
    })
})
