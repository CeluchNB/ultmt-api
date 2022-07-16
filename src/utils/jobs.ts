import OneTimePasscode from '../models/one-time-passcode'

export const deleteExpiredPasscodes = async () => {
    const expiredTime = new Date()
    expiredTime.setHours(expiredTime.getHours() - 1)

    await OneTimePasscode.deleteMany({
        expiresAt: {
            $lt: expiredTime,
        },
    })
}
