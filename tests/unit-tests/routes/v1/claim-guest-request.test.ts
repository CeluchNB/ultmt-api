import * as Constants from '../../../../src/utils/constants'
import request from 'supertest'
import app from '../../../../src/app'
import { setUpDatabase, resetDatabase, tearDownDatabase, saveUsers } from '../../../fixtures/setup-db'
import User from '../../../../src/models/user'
import { anonId, getTeam } from '../../../fixtures/utils'
import Team from '../../../../src/models/team'
import { getEmbeddedTeam, getEmbeddedUser } from '../../../../src/utils/utils'

beforeAll(async () => {
    await setUpDatabase()
})

beforeEach(async () => {
    await saveUsers()
})

afterEach(async () => {
    await resetDatabase()
})

afterAll((done) => {
    tearDownDatabase()
    done()
})

describe('Claim Guest Request routes', () => {
    describe('POST /claim-guest-request', () => {
        it('handles success', async () => {
            const team = await Team.create(getTeam())
            const [user, guest] = await User.find()
            guest.guest = true
            guest.playerTeams.push(getEmbeddedTeam(team))
            await guest.save()
            team.players.push(getEmbeddedUser(guest))
            await team.save()

            const token = await user.generateAuthToken()

            const response = await request(app)
                .post('/api/v1/claim-guest-request')
                .set({ Authorization: `Bearer ${token}` })
                .send({ guestId: guest._id.toHexString(), teamId: team._id.toHexString() })
                .expect(201)

            expect(response.body.request).toMatchObject({
                guestId: guest._id.toHexString(),
                userId: user._id.toHexString(),
                status: 'pending',
                user: {
                    username: user.username,
                    guest: false,
                },
                guest: {
                    username: guest.username,
                    guest: true,
                },
            })
        })

        it('handles failure', async () => {
            const team = await Team.create(getTeam())
            const [user, guest] = await User.find()
            guest.guest = true
            guest.playerTeams.push(getEmbeddedTeam(team))
            await guest.save()
            team.players.push(getEmbeddedUser(guest))
            await team.save()

            const token = await user.generateAuthToken()

            const response = await request(app)
                .post('/api/v1/claim-guest-request')
                .set({ Authorization: `Bearer ${token}` })
                .send({ guestId: anonId, teamId: team._id.toHexString() })
                .expect(404)

            expect(response.body.message).toBe(Constants.UNABLE_TO_FIND_USER)
        })
    })
})
