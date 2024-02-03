import * as Constants from '../../../../src/utils/constants'
import request from 'supertest'
import app from '../../../../src/app'
import { setUpDatabase, resetDatabase, tearDownDatabase, saveUsers } from '../../../fixtures/setup-db'
import User from '../../../../src/models/user'
import { anonId, getTeam } from '../../../fixtures/utils'
import Team from '../../../../src/models/team'
import { getEmbeddedTeam, getEmbeddedUser } from '../../../../src/utils/utils'
import ClaimGuestRequest from '../../../../src/models/claim-guest-request'
import { Status } from '../../../../src/types'

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

    describe('PUT /claim-guest-request/deny', () => {
        it('succeeds', async () => {
            const team = await Team.create(getTeam())
            const [guest, user, manager] = await User.find()

            manager.managerTeams.push(getEmbeddedTeam(team))
            await manager.save()

            guest.playerTeams.push(getEmbeddedTeam(team))
            guest.guest = true
            await guest.save()

            team.managers.push(getEmbeddedUser(manager))
            team.players.push(getEmbeddedUser(guest))
            await team.save()

            const token = await manager.generateAuthToken()

            const cgr = await ClaimGuestRequest.create({ teamId: team._id, userId: user._id, guestId: guest._id })

            const response = await request(app)
                .put('/api/v1/claim-guest-request/deny')
                .set({ Authorization: `Bearer ${token}` })
                .send({ requestId: cgr._id.toHexString() })
                .expect(200)

            expect(response.body.request).toMatchObject({
                _id: cgr._id.toHexString(),
                status: Status.Denied,
            })

            const cgrRecord = await ClaimGuestRequest.findOne()
            expect(cgrRecord).toMatchObject({
                _id: cgr._id,
                status: Status.Denied,
            })
        })

        it('fails', async () => {
            const team = await Team.create(getTeam())
            const [guest, user, manager] = await User.find()

            manager.managerTeams.push(getEmbeddedTeam(team))
            await manager.save()

            guest.playerTeams.push(getEmbeddedTeam(team))
            guest.guest = true
            await guest.save()

            team.managers.push(getEmbeddedUser(manager))
            team.players.push(getEmbeddedUser(guest))
            await team.save()

            const token = await manager.generateAuthToken()

            await ClaimGuestRequest.create({ teamId: team._id, userId: user._id, guestId: guest._id })

            const response = await request(app)
                .put('/api/v1/claim-guest-request/deny')
                .set({ Authorization: `Bearer ${token}` })
                .send({ requestId: anonId })
                .expect(404)

            expect(response.body.message).toBe(Constants.UNABLE_TO_FIND_REQUEST)
        })
    })
})
