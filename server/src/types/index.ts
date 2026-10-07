export interface User {
  _id?: string;
  username: string;
  email: string;
  password?: string;
  socketId?: string;
  online: boolean;
  lastSeen: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Message {
  _id?: string;
  sender: string;
  senderId?: string;
  content: string;
  room?: string;
  to?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Room {
  _id?: string;
  name: string;
  description?: string;
  createdBy: string;
  members: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface JwtPayload {
  userId: string;
  username: string;
  email: string;
  iat?: number;
  exp?: number;
}
