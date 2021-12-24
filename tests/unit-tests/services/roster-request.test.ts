import RosterRequest from '../../../src/models/roster-request'
import User from '../../../src/models/user'
import Team from '../../../src/models/team'
import { setUpDatabase, resetDatabase, tearDownDatabase, saveUsers } from '../../fixtures/setup-db'

beforeAll(async () => {
    await setUpDatabase()
})

afterEach(async () => {
    await resetDatabase()
})

afterAll(() => {
    tearDownDatabase()
})

describe('test request from team', () => {
    beforeEach(async () => {
        await saveUsers()
    })
    it('with valid data', async () => {
        // do something
        const [user1] = await User.find({})

        expect(user1.firstName).toBeDefined()
    })
})
