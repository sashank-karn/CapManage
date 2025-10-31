import { Server } from 'socket.io';
import type { Server as HTTPServer } from 'http';

let io: Server | undefined;

export const initSocket = (server: HTTPServer): Server => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket: any) => {
    const userId = socket.handshake.auth?.userId as string | undefined;
    if (userId) {
      socket.join(`user:${userId}`);
    }
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};
