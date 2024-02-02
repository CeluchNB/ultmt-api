import * as Constants from '../../../../src/utils/constants'
import request from 'supertest'
import app from '../../../../src/app'
import { setUpDatabase, resetDatabase, tearDownDatabase, saveUsers } from '../../../fixtures/setup-db'
import User from '../../../../src/models/user'
import { anonId } from '../../../fixtures/utils'

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
            const [user, guest] = await User.find()
            guest.guest = true
            await guest.save()

            const token = await user.generateAuthToken()

            const response = await request(app)
                .post('/api/v1/claim-guest-request')
                .set({ Authorization: `Bearer ${token}` })
                .send({ guestId: guest._id.toHexString() })
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
            const [user, guest] = await User.find()
            guest.guest = true
            await guest.save()

            const token = await user.generateAuthToken()

            const response = await request(app)
                .post('/api/v1/claim-guest-request')
                .set({ Authorization: `Bearer ${token}` })
                .send({ guestId: anonId })
                .expect(404)

            expect(response.body.message).toBe(Constants.UNABLE_TO_FIND_USER)
        })
    })
})
