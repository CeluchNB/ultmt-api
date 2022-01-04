import { EmbeddedTeam, EmbeddedUser, ITeam, IUser } from '../types'

export const createExpressErrorObject = (message: string, code: number): { message: string; code: number } => {
    return { message, code }
}

export const getEmbeddedTeam = (team: ITeam): EmbeddedTeam => {
    return {
        _id: team._id,
        place: team.place,
        name: team.name,
        seasonStart: team.seasonStart,
        seasonEnd: team.seasonEnd,
    }
}

export const getEmbeddedUser = (user: IUser): EmbeddedUser => {
    return {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
    }
}
