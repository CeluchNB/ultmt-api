console.log('PASSPORT LOADER -> Importing passport', Date.now())
import passport from 'passport'
console.log('PASSPORT LOADER -> Importing passport local', Date.now())
import passportLocal from 'passport-local'
console.log('PASSPORT LOADER -> Importing passport jwt', Date.now())
import passportJwt, { StrategyOptions } from 'passport-jwt'
console.log('PASSPORT LOADER -> Importing bcrypt', Date.now())
import bcrypt from 'bcryptjs'
console.log('PASSPORT LOADER -> Importing constants', Date.now())
import * as Constants from '../utils/constants'
console.log('PASSPORT LOADER -> Importing redis client', Date.now())
import { client } from './redis'
console.log('PASSPORT LOADER -> Importing types', Date.now())
import { ApiError } from '../types'

const LocalStrategy = passportLocal.Strategy
const JwtStrategy = passportJwt.Strategy

console.log('PASSPORT LOADER -> passport use local', Date.now())
passport.use(
    new LocalStrategy(
        { usernameField: 'email', passwordField: 'password', session: false },
        async (email, password, done) => {
            const { default: User } = await import('../models/user')
            const user = await User.findOne({ $or: [{ email }, { username: email }] })
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
console.log('PASSPORT LOADER -> Done passport use local', Date.now())

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

console.log('PASSPORT LOADER -> passport use jwt', Date.now())
passport.use(
    new JwtStrategy(opts, async (jwtPayload, done) => {
        return done(null, { id: jwtPayload.sub })
    }),
)
console.log('PASSPORT LOADER -> Done passport use jwt', Date.now())
