import { IUser, ITeam } from '../../src/types'

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
        rosterOpen: false,
        requests: [],
        games: [],
    }
}

export const anonId = '507f191e810c19729de860ea'
