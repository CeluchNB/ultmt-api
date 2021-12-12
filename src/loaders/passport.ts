import passport from 'passport'
import passportLocal from 'passport-local'
import User from '../models/user'
import bcrypt from 'bcrypt'
import * as Constants from '../utils/constants'

const LocalStrategy = passportLocal.Strategy

passport.use(
    'local',
    new LocalStrategy(
        { usernameField: 'email', passwordField: 'password', session: false },
        async (email, password, done) => {
            const user = await User.findOne({ $or: [{ email }, { username: email }] })
            if (!user) {
                return done(null, false, { message: Constants.UNABLE_TO_LOGIN })
            }

            const match = bcrypt.compareSync(password, user.password || '')
            if (!match) {
                return done(null, false, { message: Constants.UNABLE_TO_LOGIN })
            }
            return done(null, user)
        },
    ),
)
