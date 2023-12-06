import { EmbeddedTeam, EmbeddedUser, ITeam, IUser } from '../types'

export const createExpressErrorObject = (message: string, code: number): { message: string; code: number } => {
    return { message, code }
}

export const getEmbeddedTeam = (team: ITeam): EmbeddedTeam => {
    return {
        _id: team._id,
        place: team.place,
        name: team.name,
        teamname: team.teamname,
        seasonStart: team.seasonStart,
        seasonEnd: team.seasonEnd,
        verified: team.verified,
    }
}

export const getEmbeddedUser = (user: IUser): EmbeddedUser => {
    return {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        verified: user.verified,
    }
}

export const getPasscodeHtml = (name: string, code: string): string => {
    return `<p>
Hello ${name},
<br /> <br />
Your password recovery code for The Ultmt App is: <strong>${code}</strong>. <br /> <br />
This code expires in one hour. You can recover your password by opening \
up The Ultmt App, pressing "Forgot Password" on the login page, \
and pressing "I Have A Code." Feel free to reply to this email with any questions.
<br /> <br />
Thank you!
<br />
The Ultmt App Password Recovery
</p>`
}

export const parseBoolean = (bool: string): boolean | undefined => {
    if (bool === 'true') {
        return true
    } else if (bool === 'false') {
        return false
    }

    return undefined
}
