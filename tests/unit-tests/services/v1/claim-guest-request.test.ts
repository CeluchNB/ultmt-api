import * as Constants from '../../../../src/utils/constants'
import ClaimGuestRequest from '../../../../src/models/claim-guest-request'
import ClaimGuestRequestServices from '../../../../src/services/v1/claim-guest-request'
import User from '../../../../src/models/user'
import { resetDatabase, saveUsers, setUpDatabase, tearDownDatabase } from '../../../fixtures/setup-db'
import { Status } from '../../../../src/types'
import { anonId, getTeam } from '../../../fixtures/utils'
import Team from '../../../../src/models/team'
import { getEmbeddedTeam, getEmbeddedUser } from '../../../../src/utils/utils'
import ArchiveTeam from '../../../../src/models/archive-team'
import { Types } from 'mongoose'

const services = new ClaimGuestRequestServices(ClaimGuestRequest, User, Team, ArchiveTeam)

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

describe('ClaimGuestRequestServices', () => {
    describe('createClaimGuestRequest', () => {
        it('succeeds', async () => {
            const team = await Team.create(getTeam())
            const [user, guest] = await User.find()
            guest.guest = true
            guest.playerTeams.push(getEmbeddedTeam(team))
            await guest.save()
            team.players.push(getEmbeddedUser(guest))
            await team.save()

            const result = await services.createClaimGuestRequest(
                user._id.toHexString(),
                guest._id.toHexString(),
                team._id.toHexString(),
            )
            expect(result).toMatchObject({
                userId: user._id,
                guestId: guest._id,
                status: Status.Pending,
            })

            const requests = await ClaimGuestRequest.find()
            expect(requests.length).toBe(1)
            expect(requests[0]).toMatchObject({
                userId: user._id,
                guestId: guest._id,
                status: Status.Pending,
            })
        })

        it('fails with unfound real user', async () => {
            const [guest] = await User.find()
            await expect(services.createClaimGuestRequest(anonId, guest._id.toHexString(), anonId)).rejects.toThrow(
                Constants.UNABLE_TO_FIND_USER,
            )
        })

        it('fails with unfound guest', async () => {
            const [user] = await User.find()
            await expect(services.createClaimGuestRequest(user._id.toHexString(), anonId, anonId)).rejects.toThrow(
                Constants.UNABLE_TO_FIND_USER,
            )
        })

        it('fails with unfound team', async () => {
            const [user, guest] = await User.find()

            await expect(
                services.createClaimGuestRequest(user._id.toHexString(), guest._id.toHexString(), anonId),
            ).rejects.toThrow(Constants.UNABLE_TO_FIND_TEAM)
        })

        it('fails with non-guest', async () => {
            const team = await Team.create(getTeam())
            const [user, guest] = await User.find()
            guest.playerTeams.push(getEmbeddedTeam(team))
            await guest.save()
            team.players.push(getEmbeddedUser(guest))
            await team.save()

            await expect(
                services.createClaimGuestRequest(
                    user._id.toHexString(),
                    guest._id.toHexString(),
                    team._id.toHexString(),
                ),
            ).rejects.toThrow(Constants.USER_IS_NOT_A_GUEST)
        })

        it('fails with guest not on team', async () => {
            const team = await Team.create(getTeam())
            const [user, guest] = await User.find()
            guest.guest = true
            await guest.save()

            await expect(
                services.createClaimGuestRequest(
                    user._id.toHexString(),
                    guest._id.toHexString(),
                    team._id.toHexString(),
                ),
            ).rejects.toThrow(Constants.PLAYER_NOT_ON_TEAM)
        })
    })

    describe('denyClaimGuestRequest', () => {
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

            const request = await ClaimGuestRequest.create({ teamId: team._id, userId: user._id, guestId: guest._id })

            const result = await services.denyClaimGuestRequest(manager._id.toHexString(), request._id.toHexString())

            expect(result._id.toHexString()).toBe(request._id.toHexString())
            expect(result.status).toBe(Status.Denied)

            const requestRecord = await ClaimGuestRequest.findOne()
            expect(requestRecord?.status).toBe(Status.Denied)
        })

        it('fails with unfound manager', async () => {
            await expect(services.denyClaimGuestRequest(anonId, anonId)).rejects.toThrow(Constants.UNABLE_TO_FIND_USER)
        })

        it('fails with unfound request', async () => {
            const [user] = await User.find()
            await expect(services.denyClaimGuestRequest(user._id.toHexString(), anonId)).rejects.toThrow(
                Constants.UNABLE_TO_FIND_REQUEST,
            )
        })

        it('fails with non-manager', async () => {
            const team = await Team.create(getTeam())
            const [guest, user, manager] = await User.find()

            guest.playerTeams.push(getEmbeddedTeam(team))
            guest.guest = true
            await guest.save()

            team.players.push(getEmbeddedUser(guest))
            await team.save()

            const request = await ClaimGuestRequest.create({ teamId: team._id, userId: user._id, guestId: guest._id })
            await expect(
                services.denyClaimGuestRequest(manager._id.toHexString(), request._id.toHexString()),
            ).rejects.toThrow(Constants.UNAUTHORIZED_MANAGER)
        })
    })

    describe('acceptClaimGuestRequest', () => {
        beforeEach(async () => {
            const [guest, user, manager] = await User.find()
            guest.guest = true
            await guest.save()

            const team = await Team.create({
                ...getTeam(),
                managers: [getEmbeddedUser(manager)],
                players: [getEmbeddedUser(guest)],
            })

            manager.managerTeams.push(getEmbeddedTeam(team))
            await manager.save()

            guest.playerTeams.push(getEmbeddedTeam(team))
            await guest.save()

            await ClaimGuestRequest.create({
                guestId: guest._id,
                userId: user._id,
                teamId: team._id,
            })
        })

        it('handles base success case', async () => {
            const team = await Team.findOne()
            const request = await ClaimGuestRequest.findOne()
            await ClaimGuestRequest.create({
                guestId: request?.guestId,
                userId: new Types.ObjectId(),
                teamId: team?._id,
            })

            const result = await services.acceptClaimGuestRequest(
                team!.managers[0]._id.toHexString(),
                request!._id.toHexString(),
            )

            expect(result.status).toBe(Status.Approved)

            const guestResult = await User.findById(request?.guestId)
            expect(guestResult).toBeNull()

            const userResult = await User.findById(request?.userId)

            const teamResult = await Team.findById(request?.teamId)
            expect(teamResult?.players.length).toBe(1)
            expect(teamResult?.players[0]._id.toHexString()).toBe(userResult?._id.toHexString())

            expect(userResult?.playerTeams.length).toBe(1)
            expect(userResult?.playerTeams[0]._id.toHexString()).toBe(team?._id.toHexString())

            const guestUser = await User.findById(request?.guestId)
            expect(guestUser).toBeNull()

            const otherRequests = await ClaimGuestRequest.find({ guestId: request?.guestId, status: Status.Denied })
            expect(otherRequests.length).toBe(1)
        })

        it('updates archive teams', async () => {
            const team = await Team.findOne()
            const request = await ClaimGuestRequest.findOne()
            const guest = await User.findById(request?.guestId)

            const archiveTeam = await ArchiveTeam.create({
                ...getTeam(),
                _id: new Types.ObjectId(),
                continuationId: team?.continuationId,
                players: [getEmbeddedUser(guest!)],
            })

            guest?.archiveTeams.push(getEmbeddedTeam(archiveTeam))
            await guest?.save()

            const result = await services.acceptClaimGuestRequest(
                team!.managers[0]._id.toHexString(),
                request!._id.toHexString(),
            )

            expect(result.status).toBe(Status.Approved)

            const guestResult = await User.findById(request?.guestId)
            expect(guestResult).toBeNull()

            const userResult = await User.findById(request?.userId)
            const teamResult = await Team.findById(request?.teamId)

            expect(teamResult?.players.length).toBe(1)
            expect(teamResult?.players[0]._id.toHexString()).toBe(userResult?._id.toHexString())

            expect(userResult?.playerTeams.length).toBe(1)
            expect(userResult?.playerTeams[0]._id.toHexString()).toBe(team?._id.toHexString())

            const archiveTeamResult = await ArchiveTeam.findById(archiveTeam._id)
            expect(archiveTeamResult?.players.length).toBe(1)
            expect(archiveTeamResult?.players[0]._id.toHexString()).toBe(userResult?._id.toHexString())
        })

        it('skips reconciling when user is already on team', async () => {
            const team = await Team.findOne()
            const request = await ClaimGuestRequest.findOne()
            const user = await User.findById(request?.userId)

            team?.players.push(getEmbeddedUser(user!))
            await team?.save()

            user?.playerTeams.push(getEmbeddedTeam(team!))
            await user?.save()

            const result = await services.acceptClaimGuestRequest(
                team!.managers[0]._id.toHexString(),
                request!._id.toHexString(),
            )

            expect(result.status).toBe(Status.Approved)

            const guestResult = await User.findById(request?.guestId)
            expect(guestResult).toBeNull()

            const userResult = await User.findById(request?.userId)
            expect(userResult?.playerTeams.length).toBe(1)

            const teamResult = await Team.findById(request?.teamId)
            expect(teamResult?.players.length).toBe(2)
        })

        it('fails on previously approved request', async () => {
            const team = await Team.findOne()

            const request = await ClaimGuestRequest.findOne()
            request!.status = Status.Approved
            await request?.save()

            await expect(
                services.acceptClaimGuestRequest(team!.managers[0]._id.toHexString(), request!._id.toHexString()),
            ).rejects.toThrow(Constants.REQUEST_ALREADY_RESOLVED)
        })
    })
})
