import ITeamDesignation, { TeamDesignationData } from '../../types/team-designation'
import TeamDesignation from '../../models/team-designation'
import UltmtValidator from '../../utils/ultmt-validator'

export const createTeamDesignation = async (
    userId: string,
    designationData: TeamDesignationData,
): Promise<ITeamDesignation> => {
    await new UltmtValidator().userIsAdmin(userId).test()

    const { description, abbreviation } = designationData
    const designation = await TeamDesignation.findOneAndUpdate(
        { description, abbreviation },
        {},
        { upsert: true, new: true },
    )

    return designation
}

export const getDesignations = async (): Promise<ITeamDesignation[]> => {
    return await TeamDesignation.find()
}
