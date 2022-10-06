import passport from 'passport'
import passportLocal from 'passport-local'
import passportJwt, { StrategyOptions } from 'passport-jwt'
import User from '../models/user'
import bcrypt from 'bcryptjs'
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
            return done(null, { id: user._id.toString() })
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
        // check
        const token = jwt.sign(jwtPayload, process.env.JWT_SECRET as string)
        // check redis blacklist for token

        return done(null, { id: jwtPayload.sub })
    }),
)
