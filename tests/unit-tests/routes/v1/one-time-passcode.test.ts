import * as Constants from '../../../../src/utils/constants'
import request from 'supertest'
import app from '../../../../src/app'
import User from '../../../../src/models/user'
import OneTimePasscode from '../../../../src/models/one-time-passcode'
import { setUpDatabase, resetDatabase, tearDownDatabase } from '../../../fixtures/setup-db'
import { getUser } from '../../../fixtures/utils'
import { OTPReason } from '../../../../src/types'
import randomstring from 'randomstring'
import { client } from '../../../../src/loaders/redis'

beforeAll(async () => {
    await setUpDatabase()
})

afterEach(async () => {
    await resetDatabase()
})

afterAll((done) => {
    tearDownDatabase()
    if (client.isOpen) {
        client.quit()
    }
    done()
})

describe('test /DELETE expired OTPs', () => {
    it('should successfully delete otps', async () => {
        const user = await User.create(getUser())
        const earlier = new Date()
        earlier.setUTCHours(earlier.getUTCHours() - 1)
        await OneTimePasscode.create({
            reason: OTPReason.TeamJoin,
            creator: user._id,
            expiresAt: new Date(),
        })

        await OneTimePasscode.create({
            reason: OTPReason.PasswordRecovery,
            creator: user._id,
            expiresAt: earlier,
        })

        await request(app).delete('/api/v1/otp/expired').send().expect(200)

        const otps = await OneTimePasscode.find({})
        expect(otps.length).toBe(1)
        expect(otps[0].reason).toBe(OTPReason.TeamJoin)
    })

    it('should handle delete failure', async () => {
        jest.spyOn(OneTimePasscode, 'deleteMany').mockImplementationOnce(() => {
            throw new Error('error')
        })

        const user = await User.create(getUser())
        const earlier = new Date()
        earlier.setUTCHours(earlier.getUTCHours() - 1)
        await OneTimePasscode.create({
            reason: OTPReason.TeamJoin,
            creator: user._id,
            expiresAt: new Date(),
        })

        await OneTimePasscode.create({
            reason: OTPReason.PasswordRecovery,
            creator: user._id,
            expiresAt: earlier,
        })

        await request(app).delete('/api/v1/otp/expired').send().expect(500)

        const otps = await OneTimePasscode.find({})
        expect(otps.length).toBe(2)
    })
})

describe('test /POST otp', () => {
    it('with valid data', async () => {
        const user = await User.create(getUser())
        const token = await user.generateAuthToken()
        jest.spyOn(randomstring, 'generate').mockImplementationOnce(() => {
            return '123456'
        })

        const result = await request(app)
            .post('/api/v1/otp')
            .set('Authorization', `Bearer ${token}`)
            .send({ reason: 'gamejoin' })
            .expect(201)

        expect(result.body.code).toBe('123456')
    })

    it('with invalid token', async () => {
        const user = await User.create(getUser())
        await user.generateAuthToken()
        jest.spyOn(randomstring, 'generate').mockImplementationOnce(() => {
            return '123456'
        })

        await request(app)
            .post('/api/v1/otp')
            .set('Authorization', `Bearer basdf.43134a.adsfa`)
            .send({ reason: 'gamejoin' })
            .expect(401)
    })

    it('with invalid reason', async () => {
        const user = await User.create(getUser())
        const token = await user.generateAuthToken()
        jest.spyOn(randomstring, 'generate').mockImplementationOnce(() => {
            return '123456'
        })

        const result = await request(app)
            .post('/api/v1/otp')
            .set('Authorization', `Bearer ${token}`)
            .send({ reason: 'badreason' })
            .expect(500)

        expect(result.body.message).toBe(Constants.GENERIC_ERROR)
    })
})
