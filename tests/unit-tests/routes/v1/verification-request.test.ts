import * as Constants from '../../../../src/utils/constants'
import request from 'supertest'
import app from '../../../../src/app'
import VerificationRequest from '../../../../src/models/verification-request'
import { setUpDatabase, resetDatabase, tearDownDatabase } from '../../../fixtures/setup-db'
import { getTeam, getUser } from '../../../fixtures/utils'
import { Types } from 'mongoose'
import { client } from '../../../../src/loaders/redis'
import User from '../../../../src/models/user'
import sgMail from '@sendgrid/mail'
import Team from '../../../../src/models/team'

beforeAll(async () => {
    await setUpDatabase()
})

afterEach(async () => {
    await resetDatabase()
})

afterAll(() => {
    tearDownDatabase()
    if (client.isOpen) {
        client.quit()
    }
})

describe('Verfication Request', () => {
    describe('GET /verification-request', () => {
        it('with successful response', async () => {
            const user = getUser()
            const expected = await VerificationRequest.create({
                sourceType: 'user',
                sourceId: new Types.ObjectId(),
                creator: user,
            })
            const response = await request(app)
                .get(`/api/v1/verification-request/${expected._id.toHexString()}`)
                .send()
                .expect(200)

            const { verificationRequest: result } = response.body

            expect(result._id).toBe(expected._id.toHexString())
            expect(result.sourceType).toBe(expected.sourceType)
            expect(result.sourceId).toBe(expected.sourceId.toHexString())
            expect(result.status).toBe(expected.status)
        })

        it('with error response', async () => {
            const response = await request(app)
                .get(`/api/v1/verification-request/${new Types.ObjectId().toHexString()}`)
                .send()
                .expect(404)

            expect(response.body.message).toBe(Constants.UNABLE_TO_FIND_VERIFICATION)
        })
    })

    describe('POST /verification-request', () => {
        it('creates verification request', async () => {
            const spy = jest.spyOn(sgMail, 'send').mockReturnValueOnce(
                Promise.resolve([
                    {
                        statusCode: 200,
                        body: {},
                        headers: {},
                    },
                    {},
                ]),
            )
            const user = await User.create(getUser())
            const token = await user.generateAuthToken()
            const sourceId = new Types.ObjectId()
            await Team.create({ ...getTeam(), _id: sourceId })

            await request(app)
                .post('/api/v1/verification-request')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    sourceType: 'team',
                    sourceId,
                })
                .expect(201)

            const verificationRequest = await VerificationRequest.findOne({})
            expect(spy).toHaveBeenCalled()
            expect(verificationRequest?.sourceId.toHexString()).toBe(sourceId.toHexString())
            expect(verificationRequest?.sourceType).toBe('team')
            expect(verificationRequest?.creator._id.toHexString()).toBe(user._id.toHexString())
        })

        it('handles error case', async () => {
            const user = await User.create(getUser())
            const token = await user.generateAuthToken()
            const sourceId = new Types.ObjectId()

            const response = await request(app)
                .post('/api/v1/verification-request')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    sourceType: 'game',
                    sourceId,
                })
                .expect(400)

            expect(response.body.message).toBe(Constants.INVALID_SOURCE_TYPE)
        })
    })

    describe('PUT /verification-request', () => {
        it('handles approval', async () => {
            const user = await User.create({ ...getUser(), email: 'noah.celuch@gmail.com' })
            const token = await user.generateAuthToken()

            const original = await VerificationRequest.create({
                sourceType: 'user',
                sourceId: new Types.ObjectId(),
                creator: user,
            })

            const response = await request(app)
                .put(`/api/v1/verification-request/${original._id.toHexString()}?response=approved`)
                .set('Authorization', `Bearer ${token}`)
                .send()
                .expect(200)

            const { verificationRequest: result } = response.body

            expect(result.status).toBe('approved')
        })

        it('handles error case', async () => {
            const user = await User.create(getUser())
            const token = await user.generateAuthToken()

            const original = await VerificationRequest.create({
                sourceType: 'user',
                sourceId: new Types.ObjectId(),
                creator: user,
            })

            const response = await request(app)
                .put(`/api/v1/verification-request/${original._id.toHexString()}?response=approved`)
                .set('Authorization', `Bearer ${token}`)
                .send()
                .expect(401)

            expect(response.body.message).toBe(Constants.UNAUTHORIZED_TO_VERIFY)
        })
    })
})
