import { Server, Socket } from 'socket.io';
import Message from '../models/Message.js';
import User from '../models/User.js';
import logger from '../config/logger.js';
import { validateMessage, sanitizeInput } from '../middleware/validation.js';

export const registerSocketHandlers = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    logger.info('User connected', { socketId: socket.id });

    socket.on('join', async (data: any) => {
      try {
        const { username, userId, room = 'general' } = data;

        if (!username || !userId) {
          socket.emit('error', { message: 'Username and userId are required' });
          return;
        }

        socket.join(room);
        socket.data = { username, userId, room };

        await User.findByIdAndUpdate(userId, {
          socketId: socket.id,
          online: true,
          lastSeen: new Date(),
        });

        const recentMessages = await Message.find({ room })
          .sort({ createdAt: -1 })
          .limit(50)
          .lean();

        socket.emit('recentMessages', recentMessages.reverse());

        const onlineUsers = await User.find({ online: true }).select('username _id').lean();
        io.to(room).emit('onlineUsers', onlineUsers);
        io.to(room).emit('userJoined', { username, room });

        logger.info('User joined room', { username, room });
      } catch (error) {
        logger.error('Join error', { error });
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    socket.on('message', async (data: any) => {
      try {
        const { content, room = 'general' } = data;
        const { username, userId } = socket.data;

        if (!validateMessage(content)) {
          socket.emit('error', { message: 'Invalid message' });
          return;
        }

        const sanitizedContent = sanitizeInput(content);
        const message = new Message({
          sender: username,
          senderId: userId,
          content: sanitizedContent,
          room,
        });

        await message.save();
        io.to(room).emit('message', message.toObject());

        logger.info('Message sent', { username, room });
      } catch (error) {
        logger.error('Message error', { error });
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('privateMessage', async (data: any) => {
      try {
        const { toUsername, content } = data;
        const { username, userId } = socket.data;

        if (!validateMessage(content)) {
          socket.emit('error', { message: 'Invalid message' });
          return;
        }

        const sanitizedContent = sanitizeInput(content);
        const message = new Message({
          sender: username,
          senderId: userId,
          content: sanitizedContent,
          to: toUsername,
        });

        await message.save();

        const targetUser = await User.findOne({ username: toUsername });
        if (targetUser?.socketId) {
          io.to(targetUser.socketId).emit('privateMessage', message.toObject());
        }

        socket.emit('privateMessage', message.toObject());
        logger.info('Private message sent', { from: username, to: toUsername });
      } catch (error) {
        logger.error('Private message error', { error });
        socket.emit('error', { message: 'Failed to send private message' });
      }
    });

    socket.on('typing', (data: any) => {
      const { room = 'general' } = data;
      const { username } = socket.data;
      socket.to(room).emit('userTyping', { username });
    });

    socket.on('stopTyping', (data: any) => {
      const { room = 'general' } = data;
      const { username } = socket.data;
      socket.to(room).emit('userStoppedTyping', { username });
    });

    socket.on('switchRoom', async (data: any) => {
      try {
        const { fromRoom, toRoom } = data;
        const { username, userId } = socket.data;

        socket.leave(fromRoom);
        socket.join(toRoom);
        socket.data.room = toRoom;

        const recentMessages = await Message.find({ room: toRoom })
          .sort({ createdAt: -1 })
          .limit(50)
          .lean();

        socket.emit('recentMessages', recentMessages.reverse());
        io.to(toRoom).emit('userJoined', { username, room: toRoom });

        logger.info('User switched room', { username, fromRoom, toRoom });
      } catch (error) {
        logger.error('Switch room error', { error });
        socket.emit('error', { message: 'Failed to switch room' });
      }
    });

    socket.on('disconnect', async () => {
      try {
        const { username, userId, room } = socket.data;

        if (userId) {
          await User.findByIdAndUpdate(userId, {
            online: false,
            lastSeen: new Date(),
            socketId: null,
          });
        }

        const onlineUsers = await User.find({ online: true }).select('username _id').lean();
        io.to(room || 'general').emit('onlineUsers', onlineUsers);
        io.to(room || 'general').emit('userLeft', { username });

        logger.info('User disconnected', { socketId: socket.id, username });
      } catch (error) {
        logger.error('Disconnect error', { error });
      }
    });
  });
};
