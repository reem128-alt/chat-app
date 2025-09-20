# 💬 Chat Application

A real-time chat application built with Node.js, Express, Socket.IO, MongoDB, and Redis.

## 🚀 Features

- **Real-time messaging** with Socket.IO
- **User authentication** and online status
- **Typing indicators** and user presence
- **Message history** with MongoDB
- **Redis caching** for performance
- **Responsive design** with modern UI
- **Room-based chat** system

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js, TypeScript
- **Real-time**: Socket.IO
- **Database**: MongoDB (primary), Redis (caching)
- **Frontend**: HTML5, CSS3, JavaScript
- **ORM**: Mongoose
- **Language**: TypeScript

## 📋 Prerequisites

Before running this application, make sure you have:

- Node.js (v14 or higher)
- MongoDB (running locally or MongoDB Atlas)
- Redis (running locally or Redis Cloud)

## 🔧 Installation

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd chat-app
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp env.example .env
   ```

   Edit `.env` file with your configuration:

   ```env
   MONGODB_URI=mongodb://localhost:27017/chat-app
   REDIS_URL=redis://localhost:6379
   PORT=3000
   NODE_ENV=development
   JWT_SECRET=your-super-secret-jwt-key-here
   ```

4. **Start MongoDB and Redis**

   **MongoDB:**

   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest

   # Or install locally and start the service
   mongod
   ```

   **Redis:**

   ```bash
   # Using Docker
   docker run -d -p 6379:6379 --name redis redis:latest

   # Or install locally and start the service
   redis-server
   ```

5. **Run the application**

   ```bash
   # Development mode (with TypeScript)
   npm run dev

   # Build for production
   npm run build

   # Production mode
   npm start
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## 📁 Project Structure

```
chat-app/
├── src/
│   ├── config/
│   │   └── database.ts      # Database connections (MongoDB & Redis)
│   ├── models/
│   │   ├── User.ts         # User schema
│   │   ├── Message.ts      # Message schema
│   │   └── ChatRoom.ts     # Chat room schema
│   ├── socket/
│   │   └── socketHandlers.ts # Socket.IO event handlers
│   ├── types/
│   │   └── index.ts        # TypeScript type definitions
│   └── server.ts           # Main server file
├── public/
│   └── index.html          # Frontend chat interface
├── dist/                   # Compiled JavaScript files
├── package.json            # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── README.md              # This file
```

## 🗄️ Database Schema

### User Model

- `username`: Unique username
- `email`: User email address
- `avatar`: Profile picture URL
- `isOnline`: Online status
- `lastSeen`: Last activity timestamp

### Message Model

- `content`: Message text
- `sender`: Reference to User
- `chatRoom`: Reference to ChatRoom
- `messageType`: Type of message (text, image, file)
- `attachments`: File attachments
- `isEdited`: Edit status
- `isDeleted`: Delete status

### ChatRoom Model

- `name`: Room name
- `description`: Room description
- `type`: Room type (private, group, public)
- `participants`: Array of users with roles
- `createdBy`: Room creator
- `lastMessage`: Reference to last message
- `lastActivity`: Last activity timestamp

## 🔌 API Endpoints

- `GET /` - Chat application interface
- `GET /api/health` - Health check endpoint

## 🎯 Socket.IO Events

### Client to Server

- `join` - Join a chat room
- `send_message` - Send a message
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator
- `leave` - Leave a chat room

### Server to Client

- `recent_messages` - Recent messages when joining
- `new_message` - New message received
- `user_joined` - User joined notification
- `user_left` - User left notification
- `user_typing` - Typing indicator
- `error` - Error messages

## 🚀 Deployment

### Using Docker

1. **Create Dockerfile**

   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN npm run build
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. **Create docker-compose.yml**

   ```yaml
   version: "3.8"
   services:
     app:
       build: .
       ports:
         - "3000:3000"
       environment:
         - MONGODB_URI=mongodb://mongodb:27017/chat-app
         - REDIS_URL=redis://redis:6379
       depends_on:
         - mongodb
         - redis

     mongodb:
       image: mongo:latest
       ports:
         - "27017:27017"

     redis:
       image: redis:latest
       ports:
         - "6379:6379"
   ```

3. **Deploy**
   ```bash
   docker-compose up -d
   ```

### Using Cloud Services

- **MongoDB Atlas** for database hosting
- **Redis Cloud** for Redis hosting
- **Heroku**, **Railway**, or **DigitalOcean** for app hosting

## 🔧 Configuration

### Environment Variables

| Variable      | Description               | Default                              |
| ------------- | ------------------------- | ------------------------------------ |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/chat-app` |
| `REDIS_URL`   | Redis connection string   | `redis://localhost:6379`             |
| `PORT`        | Server port               | `3000`                               |
| `NODE_ENV`    | Environment               | `development`                        |
| `JWT_SECRET`  | JWT secret key            | Required for production              |

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB connection failed**

   - Ensure MongoDB is running
   - Check connection string in `.env`
   - Verify network connectivity

2. **Redis connection failed**

   - Ensure Redis is running
   - Check Redis URL in `.env`
   - Verify Redis server is accessible

3. **Socket.IO connection issues**
   - Check CORS settings
   - Verify port configuration
   - Check firewall settings

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🙏 Acknowledgments

- Socket.IO for real-time communication
- MongoDB for flexible data storage
- Redis for high-performance caching
- Express.js for the web framework
