import request from 'supertest'
import app from '../../../src/app'
import User from '../../../src/models/user'
import OneTimePasscode from '../../../src/models/one-time-passcode'
import { setUpDatabase, resetDatabase, tearDownDatabase } from '../../fixtures/setup-db'
import { getUser } from '../../fixtures/utils'
import { OTPReason } from '../../../src/types'

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
