import { connect, connection } from 'mongoose'
import User from '../../src/models/user'
import Team from '../../src/models/team'
import { CreateUser } from '../../src/types'
import RosterRequest from '../../src/models/roster-request'
import ArchiveTeam from '../../src/models/archive-team'
import OneTimePasscode from '../../src/models/one-time-passcode'
import TeamDesignation from '../../src/models/team-designation'
import VerificationRequest from '../../src/models/verification-request'
import ClaimGuestRequest from '../../src/models/claim-guest-request'
import { createClient } from 'redis'
import { connectRedis, closeRedis } from '../../src/loaders/redis'

export const redisClient = createClient({ url: process.env.REDIS_URL })

export const setUpDatabase = async () => {
    await connect(process.env.MONGOOSE_URL as string)
    await redisClient.connect()
    await connectRedis()
}

export const saveUsers = async () => {
    const user1: CreateUser = {
        firstName: 'First1',
        lastName: 'Last1',
        email: 'first.last1@email.com',
        username: 'firstlast1',
        password: 'Pass123!',
    }
    const user2: CreateUser = {
        firstName: 'First2',
        lastName: 'Last2',
        email: 'first.last2@email.com',
        username: 'firstlast2',
        password: 'Pass123!',
    }

    const user3: CreateUser = {
        firstName: 'First3',
        lastName: 'Last3',
        email: 'first.last3@email.com',
        username: 'firstlast3',
        password: 'Pass123!',
    }

    await User.create(user1)
    await User.create(user2)
    await User.create(user3)
}

export const resetDatabase = async () => {
    await User.deleteMany({})
    await Team.deleteMany({})
    await RosterRequest.deleteMany({})
    await ArchiveTeam.deleteMany({})
    await OneTimePasscode.deleteMany({})
    await VerificationRequest.deleteMany({})
    await TeamDesignation.deleteMany({})
    await ClaimGuestRequest.deleteMany({})
    if (redisClient.isOpen) {
        await redisClient.flushAll()
    }
}

export const tearDownDatabase = () => {
    connection.close()
    if (redisClient.isOpen) {
        redisClient.quit()
    }
    closeRedis()
}
