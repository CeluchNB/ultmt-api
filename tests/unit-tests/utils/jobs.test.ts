import { deleteExpiredPasscodes } from '../../../src/utils/jobs'
import OneTimePasscode from '../../../src/models/one-time-passcode'
import User from '../../../src/models/user'
import { OTPReason } from '../../../src/types'
import { getUser } from '../../fixtures/utils'
import { setUpDatabase, resetDatabase, tearDownDatabase } from '../../fixtures/setup-db'

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

it('should delete appropriate passcodes', async () => {
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
    await deleteExpiredPasscodes()
    const otps = await OneTimePasscode.find({})
    expect(otps.length).toBe(1)
    expect(otps[0].reason).toBe(OTPReason.TeamJoin)
})
