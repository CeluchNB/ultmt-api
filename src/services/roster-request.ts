import RosterRequest from '../models/roster-request'
import { IRosterRequestDocument } from '../types'

export const requestFromTeam = async (
    managerId: string,
    teamId: string,
    userId: string,
): Promise<IRosterRequestDocument> => {
    const rosterRequest = (await RosterRequest.findById(userId)) as IRosterRequestDocument
    return rosterRequest
}

export const requestFromPlayer = async (userId: string, teamId: string): Promise<IRosterRequestDocument> => {
    const rosterRequest = (await RosterRequest.findById(userId)) as IRosterRequestDocument
    return rosterRequest
}
