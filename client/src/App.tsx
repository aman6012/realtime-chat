import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';

type Message = {
  _id?: string;
  sender: string;
  senderId?: string;
  content: string;
  room?: string;
  to?: string;
  createdAt?: string;
};

type UserSummary = {
  _id: string;
  username: string;
  online?: boolean;
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const getToken = () => localStorage.getItem('chat-token');
const setToken = (token: string) => localStorage.setItem('chat-token', token);
const clearToken = () => localStorage.removeItem('chat-token');

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

export default function App() {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [token, setTokenState] = useState<string | null>(getToken());
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [room, setRoom] = useState('general');
  const [onlineUsers, setOnlineUsers] = useState<UserSummary[]>([]);
  const [status, setStatus] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const user = useMemo(() => ({ username }), [username]);

  const connectSocket = (nextUsername: string, nextToken: string) => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io(API_URL, {
      auth: {
        token: nextToken,
      },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setStatus('Connected');
      socket.emit('join', {
        username: nextUsername,
        userId: localStorage.getItem('chat-user-id'),
        room,
      });
    });

    socket.on('connect_error', (err) => {
      setStatus(`Connection failed: ${err.message}`);
      setIsConnected(false);
    });

    socket.on('recentMessages', (history: Message[]) => {
      setMessages(history || []);
    });

    socket.on('message', (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on('onlineUsers', (users: UserSummary[]) => {
      setOnlineUsers(users || []);
    });

    socket.on('userJoined', (payload) => {
      setStatus(`${payload.username} joined ${payload.room}`);
    });

    socket.on('userLeft', (payload) => {
      setStatus(`${payload.username} left`);
    });

    socket.on('error', (payload) => {
      setStatus(payload?.message || 'Socket error');
    });
  };

  const loadMessages = async (currentRoom: string) => {
    if (!token) return;

    try {
      const response = await axios.get(`${API_URL}/api/messages/room/${currentRoom}`, {
        headers: authHeaders(),
      });
      setMessages(response.data || []);
    } catch (error: any) {
      setStatus(error?.response?.data?.error || 'Failed to load messages');
    }
  };

  const loadOnlineUsers = async () => {
    if (!token) return;

    try {
      const response = await axios.get(`${API_URL}/api/users/online`, {
        headers: authHeaders(),
      });
      setOnlineUsers(response.data || []);
    } catch (error: any) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (token && username) {
      connectSocket(username, token);
      loadMessages(room);
      loadOnlineUsers();
    }

    return () => {
      socketRef.current?.disconnect();
    };
  }, [token, username, room]);

  const submitAuth = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const payload = authMode === 'register' ? { username, email } : { username };

      const response = await axios.post(`${API_URL}${endpoint}`, payload);
      const nextToken = response.data.token;
      const nextUsername = response.data.user?.username || username;

      setToken(nextToken);
      setTokenState(nextToken);
      localStorage.setItem('chat-user-id', response.data.user?.id || '');
      localStorage.setItem('chat-username', nextUsername);
      setUsername(nextUsername);
      setStatus(`${authMode === 'register' ? 'Registered' : 'Logged in'} successfully`);
    } catch (error: any) {
      setStatus(error?.response?.data?.error || 'Authentication failed');
    }
  };

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!messageText.trim() || !socketRef.current) return;

    socketRef.current.emit('message', { room, content: messageText });
    setMessageText('');
  };

  const logout = () => {
    clearToken();
    localStorage.removeItem('chat-user-id');
    localStorage.removeItem('chat-username');
    socketRef.current?.disconnect();
    setTokenState(null);
    setUsername('');
    setMessages([]);
    setOnlineUsers([]);
    setStatus('Logged out');
  };

  if (!token) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <h1>Realtime Chat</h1>
          <div className="toggle-row">
            <button className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>
              Register
            </button>
            <button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>
              Login
            </button>
          </div>

          <form onSubmit={submitAuth} className="auth-form">
            <input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            {authMode === 'register' && (
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}
            <button type="submit">{authMode === 'register' ? 'Create account' : 'Login'}</button>
          </form>
          {status && <p className="status">{status}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="panel-header">
          <h2>Rooms</h2>
          <button className="ghost" onClick={logout}>Logout</button>
        </div>

        <div className="room-list">
          {['general', 'design', 'engineering', 'random'].map((name) => (
            <button
              key={name}
              className={room === name ? 'room active' : 'room'}
              onClick={() => setRoom(name)}
            >
              #{name}
            </button>
          ))}
        </div>

        <div className="panel-header small">
          <h3>Online</h3>
        </div>
        <ul className="user-list">
          {onlineUsers.length > 0 ? (
            onlineUsers.map((userItem) => (
              <li key={userItem._id}>{userItem.username}</li>
            ))
          ) : (
            <li>No users online</li>
          )}
        </ul>
      </aside>

      <main className="chat-shell">
        <header className="chat-header">
          <div>
            <h2>#{room}</h2>
            <small>{isConnected ? 'Live' : 'Connecting...'}</small>
          </div>
        </header>

        <div className="messages">
          {messages.length === 0 ? (
            <div className="empty-state">No messages yet. Start the conversation.</div>
          ) : (
            messages.map((msg, index) => (
              <div key={`${msg._id || index}-${msg.createdAt || index}`} className="message-item">
                <strong>{msg.sender}</strong>
                <span>{msg.content}</span>
              </div>
            ))
          )}
        </div>

        <form onSubmit={sendMessage} className="composer">
          <input
            value={messageText}
            placeholder="Type a message..."
            onChange={(e) => setMessageText(e.target.value)}
          />
          <button type="submit" disabled={!messageText.trim()}>Send</button>
        </form>

        {status && <div className="status-bar">{status}</div>}
      </main>
    </div>
  );
}
