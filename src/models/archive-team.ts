import { schema } from './team'
import { model } from 'mongoose'
import { ITeam } from '../types'

const ArchiveTeam = model<ITeam>('ArchiveTeam', schema)

export type IArchiveTeamModel = typeof ArchiveTeam
export default ArchiveTeam
