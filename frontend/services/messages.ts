import api from './api';

export type Message = { _id: string; sender: string; text: string; createdAt: string; project?: string };

export const listMessages = async (opts: { projectId?: string; withUserId?: string; limit?: number } = {}): Promise<Message[]> => {
  const params: any = {};
  if (opts.projectId) params.projectId = opts.projectId;
  if (opts.withUserId) params.withUserId = opts.withUserId;
  if (opts.limit) params.limit = String(opts.limit);
  const { data } = await api.get('/messages', { params });
  return data.data as Message[];
};

export const sendMessageApi = async (payload: { text: string; projectId?: string; recipientId?: string }): Promise<Message> => {
  const { data } = await api.post('/messages', payload);
  return data.data as Message;
};
