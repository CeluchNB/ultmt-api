import { EmbeddedTeam, ITeam } from '../types'

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
