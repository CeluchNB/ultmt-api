import * as Constants from '../../../../src/utils/constants'
import { resetDatabase, setUpDatabase, tearDownDatabase } from '../../../fixtures/setup-db'
import { anonId, getUser } from '../../../fixtures/utils'
import User from '../../../../src/models/user'
import OneTimePasscode from '../../../../src/models/one-time-passcode'
import OneTimePasscodeServices from '../../../../src/services/v1/one-time-passcode'
import randomstring from 'randomstring'
import { ApiError } from '../../../../src/types'

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

describe('test create otp', () => {
    it('with valid data', async () => {
        jest.spyOn(randomstring, 'generate').mockImplementationOnce(() => {
            return '123456'
        })
        const user = await User.create(getUser())
        const services = new OneTimePasscodeServices(OneTimePasscode, User)

        const code = await services.createOtp(user._id.toHexString(), 'gamejoin')
        expect(code).toBe('123456')

        const otp = await OneTimePasscode.findOne({ passcode: '123456' })
        expect(otp?.creator.toString()).toBe(user._id.toString())
        expect(otp?.reason).toBe('gamejoin')
    })

    it('with unfound user', async () => {
        jest.spyOn(randomstring, 'generate').mockImplementationOnce(() => {
            return '123456'
        })
        await User.create(getUser())
        const services = new OneTimePasscodeServices(OneTimePasscode, User)

        expect(services.createOtp(anonId, 'gamejoin')).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_USER, 404),
        )
    })

    it('with invalid reason', async () => {
        jest.spyOn(randomstring, 'generate').mockImplementationOnce(() => {
            return '123456'
        })
        const user = await User.create(getUser())
        const services = new OneTimePasscodeServices(OneTimePasscode, User)

        expect(services.createOtp(user._id.toHexString(), 'badreason')).rejects.toThrow()
    })
})
