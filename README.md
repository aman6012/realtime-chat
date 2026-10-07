# Realtime Chat

A production-safe real-time chat application built with React, Express, Socket.IO, and MongoDB.

## Overview
This project delivers a modern chat experience with:
- user registration and login
- room-based real-time messaging
- online user tracking
- JWT-protected API access
- MongoDB-backed persistence
- scalable Socket.IO event handling
- clean separation between frontend and backend

## Tech Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Real-time layer: Socket.IO
- Database: MongoDB + Mongoose
- Authentication: JWT
- Security: rate limiting, input validation, CORS, sanitization

## Project Structure
```text
.
├── client/                 # React frontend
│   ├── src/
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── server/                 # Express + Socket.IO backend
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── .env.example            # global env template
├── .gitignore
├── package.json            # root scripts
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB running locally or a MongoDB connection string

### Installation
```bash
npm install
npm install --prefix server
npm install --prefix client
```

### Environment Setup
```bash
cp .env.example .env
cp server/.env.example server/.env
```

Update `server/.env` if needed:
```env
PORT=3000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/realtime-chat
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
SOCKET_IO_CORS_ORIGIN=http://localhost:5173
```

### Run the app
```bash
npm run dev
```

Then open:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000

## Features
- Register/login flow
- live chat rooms
- online user list
- secure API routes
- realtime socket events
- MongoDB message persistence

## Notes
This repo is structured as a production-safe starting point for a real-time messaging product and is intended to be extended with features like private messaging, typing indicators, unread counts, and deployment configuration.
