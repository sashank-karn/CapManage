import api from './api';

export interface ModuleRequirementResponse {
  module: string;
  requirements: Array<{
    _id: string;
    feature?: string | null;
    userStory?: string | null;
    acceptanceCriteria?: string | null;
    priority?: string | null;
  }>;
}

export const fetchModuleRequirements = async (modulePath: string): Promise<ModuleRequirementResponse> => {
  const { data } = await api.get(`${modulePath}/requirements`);
  return data.data as ModuleRequirementResponse;
};

export const fetchModulePreview = async (modulePath: string, endpoint = 'preview'): Promise<unknown> => {
  const { data } = await api.get(`${modulePath}/${endpoint}`);
  return data.data;
};
