import { Requirement, type IRequirementDocument } from '../models/Requirement';

export const getRequirementsByModule = async (moduleName: string): Promise<IRequirementDocument[]> => {
  return Requirement.find({ moduleName }).sort({ rawRowIndex: 1 });
};

export const getModuleOverview = async (): Promise<Record<string, number>> => {
  const modules = await Requirement.aggregate([
    {
      $group: {
        _id: '$moduleName',
        count: { $sum: 1 }
      }
    }
  ]);

  return modules.reduce<Record<string, number>>((acc, current: { _id: string; count: number }) => {
    acc[current._id] = current.count;
    return acc;
  }, {});
};
