import { schema } from './team'
import { model } from 'mongoose'
import { ITeamDocument } from '../types'

const ArchiveTeam = model<ITeamDocument>('ArchiveTeam', schema)

export type IArchiveTeamModel = typeof ArchiveTeam
export default ArchiveTeam
