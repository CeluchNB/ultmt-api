import * as Constants from '../../utils/constants'
import User from '../../models/user'
import Verification from '../../models/verification'
import { ApiError } from '../../types'
import sgMail from '@sendgrid/mail'

const VALID_SOURCE_TYPES = ['team', 'user', 'tournament']

export const requestVerification = async (sourceType: string, sourceId: string, creatorId: string) => {
    const user = await User.findById(creatorId)

    if (VALID_SOURCE_TYPES.includes(sourceType)) {
        throw new ApiError(Constants.INVALID_SOURCE_TYPE, 400)
    }

    await Verification.create({
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
<a href="https://theultmtapp.com/verify-request"><p>Verify Request</p></a>
</div>
        `,
    })
}

export const acceptVerification = async () => {}

export const denyVerification = async () => {}
