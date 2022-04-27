import OneTimePasscode from '../../../src/models/one-time-passcode'
import User from '../../../src/models/user'
import { OTPReason } from '../../../src/types'
import { setUpDatabase, resetDatabase, tearDownDatabase } from '../../fixtures/setup-db'
import { getUser } from '../../fixtures/utils'
import randomstring from 'randomstring'

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

describe('test one time passcode model', () => {
    it('creates passcode correctly', async () => {
        const user = await User.create(getUser())
        const passcode = await OneTimePasscode.create({
            reason: OTPReason.PasswordRecovery,
            creator: user._id,
        })

        expect(passcode.reason).toBe(OTPReason.PasswordRecovery)
        expect(passcode.creator.toString()).toBe(user._id.toString())
        expect(passcode.passcode.length).toBe(6)
        expect(passcode.isExpired()).toBe(false)
    })

    it('test is expired true', async () => {
        const user = await User.create(getUser())
        const passcode = await OneTimePasscode.create({
            reason: OTPReason.PasswordRecovery,
            creator: user._id,
        })

        jest.useFakeTimers()
        jest.advanceTimersByTime(61 * 60 * 1000)

        expect(passcode.isExpired()).toBe(true)
        jest.runAllTimers()
        jest.useRealTimers()
    })

    it('test uniqueness', async () => {
        const user = await User.create(getUser())

        const spy = jest.spyOn(randomstring, 'generate').mockReturnValueOnce('123456')

        await OneTimePasscode.create({
            reason: OTPReason.PasswordRecovery,
            creator: user._id,
            passcode: '123456',
        })

        expect(spy).toHaveBeenCalledTimes(0)

        const passcode = await OneTimePasscode.create({
            reason: OTPReason.PasswordRecovery,
            creator: user._id,
        })

        expect(spy).toHaveBeenCalledTimes(2)
        expect(passcode.passcode).not.toBe('123456')
    })
})
