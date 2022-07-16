import cron from 'node-cron'
import { deleteExpiredPasscodes } from '../utils/jobs'

// delete expired one time passcodes every night at 1am
// will not work with GCP Cloud Run
// refactored to an endpoint for now
cron.schedule('0 1 * * *', deleteExpiredPasscodes)
