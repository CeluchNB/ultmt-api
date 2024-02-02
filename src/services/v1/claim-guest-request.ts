import * as Constants from '../../utils/constants'
import { IClaimGuestRequestModel } from '../../models/claim-guest-request'
import { IUserModel } from '../../models/user'
import { ApiError, IClaimGuestRequest } from '../../types'
import UltmtValidator from '../../utils/ultmt-validator'

export default class ClaimGuestRequestServices {
    claimGuestRequestModel: IClaimGuestRequestModel
    userModel: IUserModel

    constructor(claimGuestRequestModel: IClaimGuestRequestModel, userModel: IUserModel) {
        this.claimGuestRequestModel = claimGuestRequestModel
        this.userModel = userModel
    }

    /**
     * Create claim guest request
     * @param userId id of real user
     * @param guestId id of guest user
     * @returns claim guest request created object
     */
    createClaimGuestRequest = async (userId: string, guestId: string): Promise<IClaimGuestRequest> => {
        const user = await this.userModel.findById(userId)
        const guest = await this.userModel.findById(guestId)
        if (!user || !guest) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        await new UltmtValidator(this.userModel).userIsGuest(guestId).test()

        return await this.claimGuestRequestModel.create({
            guestId: guest._id,
            userId: user._id,
        })
    }
}
