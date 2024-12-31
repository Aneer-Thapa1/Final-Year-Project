const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const morgan = require("morgan");
const {errorLogger} = require("./app/middleware/loggerMiddleware"); // Import Morgan
require("dotenv").config();

// Initialize the Express app
const app = express();

// Use Morgan for HTTP request logging in 'dev' format
app.use(morgan("dev"));

// Create an HTTP server from the Express app
const httpServer = createServer(app);

// Initialize Socket.IO with the HTTP server
const io = new Server(httpServer);

// Variable to keep track of the number of connected users
let onlineUsers = 0;

// Setup connection event listener for new clients
io.on("connection", (socket) => {
  onlineUsers++; // Increment the count of online users
  console.log(
    `A user connected: ${socket.id}. Total online users: ${onlineUsers}`
  );

  // Setup a disconnect listener for the connected client
  socket.on("disconnect", () => {
    onlineUsers--; // Decrement the count of online users
    console.log(
      `A user disconnected: ${socket.id}. Total online users: ${onlineUsers}`
    );
  });
});


app.use(errorLogger)

// Start the HTTP server listening for requests
httpServer.listen(process.env.PORT, () => {
  console.log(`Server is running on http://localhost:${process.env.PORT}`);
});
