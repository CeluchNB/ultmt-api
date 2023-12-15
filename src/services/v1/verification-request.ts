import * as Constants from '../../utils/constants'
import User from '../../models/user'
import VerificationRequest from '../../models/verification-request'
import { ApiError } from '../../types'
import sgMail from '@sendgrid/mail'
import { Types } from 'mongoose'
import IVerificationRequest from '../../types/verification-request'
import Team from '../../models/team'
import UltmtValidator from '../../utils/ultmt-validator'

const VALID_SOURCE_TYPES = ['team', 'user']
const ADMIN_EMAIL = 'noah.celuch@gmail.com'

// NOT USING CLASS W/ DEPENDENCY INJECTION FOR VERIFICATION REQUEST
// TODO: MIGRATE OTHER SERVICES TO THIS PATTERN?
// Use a Nodejs DI library

export const getVerification = async (verificationId: string): Promise<IVerificationRequest> => {
    const verification = await VerificationRequest.findById(verificationId)
    if (!verification) {
        throw new ApiError(Constants.UNABLE_TO_FIND_VERIFICATION, 404)
    }

    return verification
}

export const requestVerification = async (sourceType: string, sourceId: string, creatorId: string) => {
    const user = await User.findById(creatorId)

    if (!user) {
        throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
    }

    if (!VALID_SOURCE_TYPES.includes(sourceType)) {
        throw new ApiError(Constants.INVALID_SOURCE_TYPE, 400)
    }

    // TODO: verify source type + source id exists & no verification exists
    const prevVerification = await VerificationRequest.findOne({ sourceType, sourceId })
    if (prevVerification?.status === 'pending') {
        throw new ApiError(Constants.VERIFICATION_REQUEST_ALREADY_EXISTS, 400)
    }

    if (sourceType === 'team') {
        const sourceTeam = await Team.findById(sourceId)
        if (!sourceTeam) {
            throw new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404)
        }
    } else if (sourceType === 'user') {
        const sourceUser = await User.findById(sourceId)
        if (!sourceUser) {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        }
    }

    const verification = await VerificationRequest.create({
        sourceType,
        sourceId,
        creator: user,
    })

    await sgMail.send({
        to: ADMIN_EMAIL,
        from: 'developer@theultmtapp.com',
        subject: 'Request for Verification',
        html: `
<div>
<p>You have a request to verify:</p>
<p>Source Type: ${sourceType}</p>
<p>Source Id: ${sourceId}</p>
<a href="https://theultmtapp.com/verify-request?id=${verification._id}"><p>Verify Request</p></a>
</div>
        `,
    })
}

export const respondToVerification = async (
    verficationId: string,
    response: 'approved' | 'denied',
    userId = '',
): Promise<IVerificationRequest> => {
    if (!['approved', 'denied'].includes(response)) {
        throw new ApiError(Constants.INVALID_RESPONSE_TYPE, 400)
    }

    const verification = await VerificationRequest.findById(verficationId)

    if (!verification) {
        throw new ApiError(Constants.UNABLE_TO_FIND_VERIFICATION, 404)
    }

    await new UltmtValidator().userIsAdmin(userId).test()

    verification.status = response
    await verification.save()

    if (verification.status === 'approved') {
        await performVerification(verification)
    }

    return verification
}

const performVerification = async (verification: IVerificationRequest) => {
    switch (verification.sourceType) {
        case 'team':
            await verifyTeam(verification.sourceId)
            break
        case 'user':
            await verifyUser(verification.sourceId)
            break
    }
}

const verifyTeam = async (id: Types.ObjectId) => {
    await Team.findByIdAndUpdate(id, { verified: true })
}

const verifyUser = async (id: Types.ObjectId) => {
    await User.findByIdAndUpdate(id, { verified: true })
}
