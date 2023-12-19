import { teamSchema } from './team'
import { model, Schema } from 'mongoose'
import { ITeam } from '../types'

const archiveTeamSchema = new Schema<ITeam>({
    ...teamSchema,
    teamname: {
        type: String,
        required: true,
    },
})

const ArchiveTeam = model<ITeam>('ArchiveTeam', archiveTeamSchema)

export type IArchiveTeamModel = typeof ArchiveTeam
export default ArchiveTeam
