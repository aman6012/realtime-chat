export const config = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/realtime-chat',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  socketIoCorsOrigin: process.env.SOCKET_IO_CORS_ORIGIN || 'http://localhost:5173',
  logLevel: process.env.LOG_LEVEL || 'info',
  isDevelopment: process.env.NODE_ENV !== 'production',
};
