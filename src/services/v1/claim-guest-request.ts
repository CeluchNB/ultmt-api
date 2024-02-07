import * as Constants from '../../utils/constants'
import { IClaimGuestRequestModel } from '../../models/claim-guest-request'
import { IUserModel } from '../../models/user'
import { ApiError, IClaimGuestRequest, ITeam, IUser, Status } from '../../types'
import UltmtValidator from '../../utils/ultmt-validator'
import { ITeamModel } from '../../models/team'
import { Document } from 'mongoose'
import { findByIdOrThrow, getEmbeddedTeam, getEmbeddedUser, idEquals } from '../../utils/utils'
import { IArchiveTeamModel } from '../../models/archive-team'

export default class ClaimGuestRequestServices {
    claimGuestRequestModel: IClaimGuestRequestModel
    userModel: IUserModel
    teamModel: ITeamModel
    archiveTeamModel: IArchiveTeamModel

    constructor(
        claimGuestRequestModel: IClaimGuestRequestModel,
        userModel: IUserModel,
        teamModel: ITeamModel,
        archiveTeamModel: IArchiveTeamModel,
    ) {
        this.claimGuestRequestModel = claimGuestRequestModel
        this.userModel = userModel
        this.teamModel = teamModel
        this.archiveTeamModel = archiveTeamModel
    }

    /**
     * Create claim guest request
     * @param userId id of real user
     * @param guestId id of guest user
     * @returns claim guest request created object
     */
    createClaimGuestRequest = async (userId: string, guestId: string, teamId: string): Promise<IClaimGuestRequest> => {
        const user = await this.userModel.findById(userId)
        const guest = await this.userModel.findById(guestId)
        if (!user || !guest) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        const team = await this.teamModel.findById(teamId)
        if (!team) {
            throw new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404)
        }

        await new UltmtValidator(this.userModel).userIsGuest(guestId).userOnTeam(guestId, teamId).test()

        let request = await this.claimGuestRequestModel.create({
            guestId: guest._id,
            userId: user._id,
            teamId: team._id,
        })

        request = await request
            .populate('user')
            .then(() => {
                return request.populate('guest')
            })
            .then(() => {
                return request.populate('team')
            })

        return request
    }

    /**
     * Method to deny a claim guest request
     * @param managerId id of manager responding
     * @param claimGuestRequestId id of claim guest request to deny
     * @returns updated claim guest request
     */
    denyClaimGuestRequest = async (managerId: string, claimGuestRequestId: string): Promise<IClaimGuestRequest> => {
        const claimGuestRequest = await this.verifyClaimGuestRequest(managerId, claimGuestRequestId)

        claimGuestRequest.status = Status.Denied
        await claimGuestRequest.save()

        return claimGuestRequest
    }

    /**
     * Method to accept a claim guest request. Also, perform the guest claim
     * @param managerId manager id string
     * @param claimGuestRequestId id of request to accept
     * @returns updated claim guest request
     */
    acceptClaimGuestRequest = async (managerId: string, claimGuestRequestId: string): Promise<IClaimGuestRequest> => {
        const claimGuestRequest = await this.verifyClaimGuestRequest(managerId, claimGuestRequestId)

        claimGuestRequest.status = Status.Approved
        await claimGuestRequest.save()

        await this.reconcileGuest(claimGuestRequest)

        return claimGuestRequest
    }

    private verifyClaimGuestRequest = async (
        managerId: string,
        claimGuestRequestId: string,
    ): Promise<Document<unknown, unknown, IClaimGuestRequest> & IClaimGuestRequest> => {
        const manager = await this.userModel.findById(managerId)
        if (!manager) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        const claimGuestRequest = await this.claimGuestRequestModel.findById(claimGuestRequestId)
        if (!claimGuestRequest) {
            throw new ApiError(Constants.UNABLE_TO_FIND_REQUEST, 404)
        }

        if (claimGuestRequest.status !== Status.Pending) {
            throw new ApiError(Constants.REQUEST_ALREADY_RESOLVED, 400)
        }

        await new UltmtValidator().userIsManager(managerId, claimGuestRequest.teamId.toHexString()).test()

        return claimGuestRequest
    }

    private reconcileGuest = async (claimGuestRequest: IClaimGuestRequest) => {
        const guestUser = await findByIdOrThrow<IUser>(
            claimGuestRequest.guestId,
            this.userModel,
            Constants.UNABLE_TO_FIND_USER,
        )
        const realUser = await findByIdOrThrow<IUser>(
            claimGuestRequest.userId,
            this.userModel,
            Constants.UNABLE_TO_FIND_USER,
        )
        const team = await findByIdOrThrow<ITeam>(
            claimGuestRequest.teamId,
            this.teamModel,
            Constants.UNABLE_TO_FIND_TEAM,
        )

        await this.reconcilePlayerOnTeam(team, realUser, guestUser)
        await this.reconcileTeamOnPlayer(realUser, team)

        // reconcile archive teams
        const archiveTeams = await this.archiveTeamModel.find({ continuationId: team.continuationId })
        for (const archiveTeam of archiveTeams) {
            await this.reconcilePlayerOnTeam(archiveTeam, realUser, guestUser)
            await this.reconcileTeamOnPlayer(realUser, archiveTeam, true)
        }

        await guestUser.deleteOne()

        await this.claimGuestRequestModel
            .find({ guestId: claimGuestRequest.guestId, status: Status.Pending })
            .updateMany({ status: Status.Denied })
    }

    private reconcilePlayerOnTeam = async (
        team: Document<unknown, unknown, ITeam> & ITeam,
        realUser: IUser,
        guestUser: IUser,
    ) => {
        if (team.players.findIndex((p) => idEquals(p._id, realUser._id)) >= 0) return

        team.players = team.players.filter((player) => !idEquals(player._id, guestUser._id))
        team.players.push(getEmbeddedUser(realUser))
        await team.save()
    }

    private reconcileTeamOnPlayer = async (
        realUser: Document<unknown, unknown, IUser> & IUser,
        team: ITeam,
        archive = false,
    ) => {
        const teamType = archive ? 'archiveTeams' : 'playerTeams'
        if (realUser[teamType].findIndex((t) => idEquals(t._id, team._id)) >= 0) return

        realUser[teamType].push(getEmbeddedTeam(team))

        await realUser.save()
    }
}
