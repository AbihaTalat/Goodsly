const app = require("./app");
const connectDatabase = require("./db/Database");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const repository = require("./store/repository");
const { jwtSecret } = require("./middleware/auth");

// Handling uncaught Exception
process.on("uncaughtException", (err) => {
  console.log(`Error: ${err.message}`);
  process.exit(1);
});

const port = Number.parseInt(process.env.PORT, 10) || 8000;

async function startServer() {
  await connectDatabase();

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: (process.env.FRONTEND_URLS || "http://localhost:3000").split(",").map((value) => value.trim()), credentials: true },
  });
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, "");
      if (!token) return next(new Error("Authentication required"));
      const decoded = jwt.verify(token, jwtSecret());
      const user = await repository.users.findById(decoded.id);
      if (!user) return next(new Error("User not found"));
      socket.user = user;
      return next();
    } catch (error) {
      return next(new Error("Invalid authentication token"));
    }
  });
  io.on("connection", (socket) => {
    socket.on("conversation:join", async (conversationId, callback) => {
      if (await repository.chat.canAccess(conversationId, socket.user._id)) {
        socket.join(`conversation:${conversationId}`);
        if (callback) callback({ ok: true });
      } else if (callback) callback({ ok: false, message: "Conversation not found" });
    });
    socket.on("message:send", async ({ conversationId, body }, callback) => {
      const conversation = await repository.chat.canAccess(conversationId, socket.user._id);
      if (!conversation || !String(body || "").trim()) return callback?.({ ok: false, message: "Message cannot be empty" });
      const message = await repository.chat.createMessage(conversationId, socket.user._id, String(body).trim().slice(0, 2000));
      io.to(`conversation:${conversationId}`).emit("message:new", message);
      callback?.({ ok: true, message });
    });
  });
  server.io = io;
  server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });

  process.on("unhandledRejection", (err) => {
    console.error(`Unhandled promise rejection: ${err.message}`);
    server.close(() => process.exit(1));
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };