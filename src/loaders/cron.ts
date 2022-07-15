import cron from 'node-cron'
import { deleteExpiredPasscodes } from '../utils/jobs'

// delete expired one time passcodes every night at 1am
cron.schedule('0 1 * * *', deleteExpiredPasscodes)
