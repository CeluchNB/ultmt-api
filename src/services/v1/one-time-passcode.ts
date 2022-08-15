import * as Constants from '../../utils/constants'
import { IOneTimePasscodeModel } from '../../models/one-time-passcode'
import { IUserModel } from '../../models/user'
import { ApiError } from '../../types'

class OneTimePasscodeServices {
    otpModel: IOneTimePasscodeModel
    userModel: IUserModel
    constructor(otpModel: IOneTimePasscodeModel, userModel: IUserModel) {
        this.otpModel = otpModel
        this.userModel = userModel
    }

    /**
     * Method to create an otp from a remote source
     * @param creatorId id of user requesting otp
     * @param reason reason for otp (must be one of valid reasons defined in model)
     * @returns 6 digit code
     */
    createOtp = async (creatorId: string, reason: string): Promise<string> => {
        const user = await this.userModel.findById(creatorId)
        if (!user) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }

        const otp = await this.otpModel.create({ reason, creator: user._id })
        return otp.passcode
    }
}

export default OneTimePasscodeServices
