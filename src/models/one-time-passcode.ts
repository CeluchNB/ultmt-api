import { Schema, SchemaTypes, model } from 'mongoose'
import { IOneTimePasscode, OTPReason } from '../types'
import randomstring from 'randomstring'

const schema = new Schema<IOneTimePasscode>({
    passcode:  {
        type: String,
        unique: true,
        minLength: 6,
        maxLength: 6,
    },
    reason: {
        type: String,
        required: true,
        enum: Object.values(OTPReason),
    },
    creator: {
        type: SchemaTypes.ObjectId,
        required: true,
        ref: 'User',
    },
    expiresAt: {
        type: SchemaTypes.Date,
    }
}, { timestamps: true })

schema.pre('save', async function(next) {
    if (!this.passcode) {
        this.passcode = randomstring.generate({ length: 6, charset: 'numeric' })

        // continually generate new passcode if current one is not unique
        while (true) {
            const passcode = await OneTimePasscode.findOne({ passcode: this.passcode })
            if (passcode) {
                this.passcode = randomstring.generate({ length: 6, charset: 'numeric' })
            } else {
                break
            }
         }
    }

    if (!this.expiresAt) {
        const expiresAt = new Date()
        expiresAt.setUTCHours(expiresAt.getUTCHours() + 1)
        this.expiresAt = expiresAt
    }

    next()
})

schema.methods.isExpired = function() {
    const now = new Date()
    return this.expiresAt < now
}

const OneTimePasscode = model<IOneTimePasscode>('OneTimePasscode', schema)

export type IOneTimePasscodeModel = typeof OneTimePasscode
export default OneTimePasscode