import * as Constants from '../../utils/constants'
import User from '../../models/user'
import VerificationRequest from '../../models/verification-request'
import { ApiError } from '../../types'
import sgMail from '@sendgrid/mail'
import { Types } from 'mongoose'
import IVerificationRequest from '../../types/verification-request'
import Team from '../../models/team'

const VALID_SOURCE_TYPES = ['team', 'user']
const ADMIN_EMAIL = 'noah.celuch@gmail.com'

// NOT USING CLASS W/ DEPENDENCY INJECTION FOR VERIFICATION REQUEST
// TODO: MIGRATE OTHER SERVICES TO THIS PATTERN

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

    const verification = await VerificationRequest.create({
        sourceType,
        sourceId,
        creator: user,
    })

    await sgMail.send({
        to: 'noah.celuch@gmail.com',
        from: 'developer@theultmtapp.com',
        subject: 'Request for Verification',
        html: `
<div>
<p>You have a request to verify:</p>
<p>Source Type: ${sourceType}</p>
<p>Source Id: ${sourceId}</p>
<a href="https://theultmtapp.com/verify-request?${verification._id}"><p>Verify Request</p></a>
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

    const user = await User.findById(userId)

    if (user?.email !== ADMIN_EMAIL) {
        throw new ApiError(Constants.UNAUTHORIZED_TO_VERIFY, 401)
    }

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
