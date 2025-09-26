require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const User = require('./models/User');
const Message = require('./models/Message');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET","POST"] }
});

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/realtime-chat';

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(()=> console.log('MongoDB connected'))
  .catch(err=> console.error('Mongo error', err));

const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  socket.on('join', async ({ username, room = 'global' } = {}) => {
    if (!username) return;
    socket.data.username = username;
    socket.join(room);

    try {
      await User.findOneAndUpdate(
        { username },
        { username, socketId: socket.id, online: true, lastSeen: new Date() },
        { upsert: true, new: true }
      );
    } catch (e) { console.error(e); }

    onlineUsers.set(username, socket.id);

    const recent = await Message.find({ room }).sort({ createdAt: -1 }).limit(50).lean();
    socket.emit('recentMessages', recent.reverse());

    io.emit('onlineUsers', Array.from(onlineUsers.keys()));
    socket.to(room).emit('userJoined', { username, room });
  });

  socket.on('message', async ({ content, room = 'global' } = {}) => {
    const username = socket.data.username || 'Anonymous';
    if (!content) return;
    const msg = new Message({ sender: username, content, room, to: null });
    await msg.save();
    io.to(room).emit('message', msg);
  });

  socket.on('privateMessage', async ({ toUsername, content } = {}) => {
    const from = socket.data.username || 'Anonymous';
    if (!toUsername || !content) return;
    const msg = new Message({ sender: from, content, room: null, to: toUsername });
    await msg.save();
    const targetSocketId = onlineUsers.get(toUsername);
    if (targetSocketId) {
      io.to(targetSocketId).emit('privateMessage', msg);
    }
    socket.emit('privateMessage', msg);
  });

  socket.on('typing', ({ room = 'global', isTyping = true } = {}) => {
    const username = socket.data.username || 'Anonymous';
    socket.to(room).emit('typing', { username, isTyping });
  });

  socket.on('switchRoom', async ({ fromRoom, toRoom }) => {
    socket.leave(fromRoom);
    socket.join(toRoom);
    const recent = await Message.find({ room: toRoom }).sort({ createdAt: -1 }).limit(50).lean();
    socket.emit('recentMessages', recent.reverse());
  });

  socket.on('getHistory', async ({ room = 'global' } = {}) => {
    const recent = await Message.find({ room }).sort({ createdAt: -1 }).limit(100).lean();
    socket.emit('recentMessages', recent.reverse());
  });

  socket.on('disconnect', async () => {
    const username = socket.data.username;
    console.log('disconnect', socket.id, username);
    if (username) {
      onlineUsers.delete(username);
      try {
        await User.findOneAndUpdate({ username }, { online: false, lastSeen: new Date(), socketId: null });
      } catch (e) { console.error(e); }
      io.emit('onlineUsers', Array.from(onlineUsers.keys()));
      io.emit('userLeft', { username });
    }
  });
});

app.get('/api/messages', async (req, res) => {
  const room = req.query.room || 'global';
  const messages = await Message.find({ room }).sort({ createdAt: 1 }).limit(100).lean();
  res.json(messages);
});

app.get('/api/online-users', (req, res) => {
  res.json(Array.from(onlineUsers.keys()));
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});