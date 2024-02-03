import * as Constants from '../../utils/constants'
import { IClaimGuestRequestModel } from '../../models/claim-guest-request'
import { IUserModel } from '../../models/user'
import { ApiError, IClaimGuestRequest, Status } from '../../types'
import UltmtValidator from '../../utils/ultmt-validator'
import { ITeamModel } from '../../models/team'

export default class ClaimGuestRequestServices {
    claimGuestRequestModel: IClaimGuestRequestModel
    userModel: IUserModel
    teamModel: ITeamModel

    constructor(claimGuestRequestModel: IClaimGuestRequestModel, userModel: IUserModel, teamModel: ITeamModel) {
        this.claimGuestRequestModel = claimGuestRequestModel
        this.userModel = userModel
        this.teamModel = teamModel
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
        const manager = await this.userModel.findById(managerId)
        if (!manager) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        const claimGuestRequest = await this.claimGuestRequestModel.findById(claimGuestRequestId)
        if (!claimGuestRequest) {
            throw new ApiError(Constants.UNABLE_TO_FIND_REQUEST, 404)
        }

        await new UltmtValidator().userIsManager(managerId, claimGuestRequest.teamId.toHexString()).test()

        claimGuestRequest.status = Status.Denied
        await claimGuestRequest.save()

        return claimGuestRequest
    }
}
