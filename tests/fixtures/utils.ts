import { IUser } from '../../src/types'

export const getUser = (): IUser => {
    return {
        firstName: 'First',
        lastName: 'Last',
        email: 'first.last@email.com',
        username: 'firstlast',
        password: 'Pass123!',
    }
}
