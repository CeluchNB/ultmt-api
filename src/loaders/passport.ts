import passport from 'passport'
import passportLocal from 'passport-local'
import passportJwt, { StrategyOptions } from 'passport-jwt'
import bcrypt from 'bcryptjs'
import * as Constants from '../utils/constants'
import { client } from './redis'
import { ApiError } from '../types'

const LocalStrategy = passportLocal.Strategy
const JwtStrategy = passportJwt.Strategy

passport.use(
    new LocalStrategy(
        { usernameField: 'email', passwordField: 'password', session: false },
        async (email, password, done) => {
            const { default: User } = await import('../models/user')
            const user = await User.findOne({ $or: [{ email }, { username: email }], guest: false })
            if (!user) {
                return done(null, false, { message: Constants.UNABLE_TO_LOGIN })
            }

            const match = bcrypt.compareSync(password, user.password || '')
            if (!match) {
                return done(null, false, { message: Constants.UNABLE_TO_LOGIN })
            }
            return done(null, { id: user._id.toString() })
        },
    ),
)

const ExtractJwt = passportJwt.ExtractJwt
const opts: StrategyOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKeyProvider: async (_req, rawJwtToken, done) => {
        // check redis blacklist here
        const exists = await client.get(rawJwtToken)
        if (exists) {
            return done(new ApiError(Constants.UNABLE_TO_VERIFY_TOKEN, 401))
        }
        return done(null, process.env.JWT_SECRET)
    },
}

passport.use(
    new JwtStrategy(opts, async (jwtPayload, done) => {
        return done(null, { id: jwtPayload.sub })
    }),
)
