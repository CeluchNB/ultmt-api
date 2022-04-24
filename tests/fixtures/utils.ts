import { Types } from 'mongoose'
import { CreateTeam, CreateUser, ITeam, IRosterRequest, Initiator, Status } from '../../src/types'

export const getUser = (): CreateUser => {
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
        _id: new Types.ObjectId(),
        place: 'Pittsburgh',
        name: 'Temper',
        teamname: 'pittsburghtemper',
        managers: [],
        players: [],
        seasonStart: new Date('2022'),
        seasonEnd: new Date('2022'),
        seasonNumber: 1,
        continuationId: new Types.ObjectId(),
        rosterOpen: false,
        requests: [],
        games: [],
    }
}

export const getCreateTeam = (): CreateTeam => {
    return {
        place: 'Pittsburgh',
        name: 'Temper',
        teamname: 'pittsburghtemper',
        seasonStart: '2022',
        seasonEnd: '2022',
    }
}

export const getRosterRequest = (team: Types.ObjectId, user: Types.ObjectId, source: Initiator): IRosterRequest => {
    return {
        _id: new Types.ObjectId(),
        team,
        user,
        requestSource: source,
        status: Status.Pending,
    }
}

export const anonId = '507f191e810c19729de860ea'
