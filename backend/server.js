const app = require("./app");
const connectDatabase = require("./db/Database");

// Handling uncaught Exception
process.on("uncaughtException", (err) => {
  console.log(`Error: ${err.message}`);
  process.exit(1);
});

const port = Number.parseInt(process.env.PORT, 10) || 8000;

async function startServer() {
  await connectDatabase();

  const server = app.listen(port, () => {
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