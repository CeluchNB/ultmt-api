import { Types } from 'mongoose'
import { IUser, ITeam, IRosterRequest, Initiator, Status } from '../../src/types'

export const getUser = (): IUser => {
    return {
        firstName: 'First',
        lastName: 'Last',
        email: 'first.last@email.com',
        username: 'firstlast',
        password: 'Pass123!',
    }
}

export const getTeam = (): ITeam => {
    return {
        place: 'Pittsburgh',
        name: 'Temper',
        managers: [],
        players: [],
        seasonStart: new Date('2021'),
        seasonEnd: new Date('2022'),
        seasonNumber: 1,
        continuationId: new Types.ObjectId(),
        rosterOpen: false,
        requests: [],
        games: [],
    }
}

export const getRosterRequest = (team: Types.ObjectId, user: Types.ObjectId, source: Initiator): IRosterRequest => {
    return {
        team,
        user,
        requestSource: source,
        status: Status.Pending,
    }
}

export const anonId = '507f191e810c19729de860ea'
