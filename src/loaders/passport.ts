import passport from 'passport'
import passportLocal from 'passport-local'
import passportJwt, { StrategyOptions } from 'passport-jwt'
import User from '../models/user'
import bcrypt from 'bcrypt'
import * as Constants from '../utils/constants'
import jwt from 'jsonwebtoken'

const LocalStrategy = passportLocal.Strategy
const JwtStrategy = passportJwt.Strategy

passport.use(
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

const ExtractJwt = passportJwt.ExtractJwt
const opts: StrategyOptions = {
    secretOrKey: process.env.JWT_SECRET,
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
}

passport.use(
    new JwtStrategy(opts, async (jwtPayload, done) => {
        const user = await User.findById(jwtPayload.sub)
        if (!user) {
            return done(null, false, { message: Constants.UNABLE_TO_FIND_USER })
        }

        const token = jwt.sign(jwtPayload, process.env.JWT_SECRET as string)
        if (!user.tokens?.includes(token)) {
            return done(null, false, { message: Constants.UNABLE_TO_VERIFY_TOKEN })
        }

        return done(null, user)
    }),
)
