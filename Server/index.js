const express = require("express");
const { createServer } = require("http");
const morgan = require("morgan");
const { errorLogger } = require("./app/middleware/loggerMiddleware");
const { initializeSocket } = require("./app/config/socketConfig");
require("dotenv").config();
const routes = require("./app/routes/route.js");
var cors = require("cors");

const app = express();

app.use(morgan("dev"));
app.use(express.json());
app.use(cors({
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    origin: "*",
}));

app.use("/api", routes);

const httpServer = createServer(app);

// Initialize Socket.IO with the configuration
const io = initializeSocket(httpServer);

app.use(errorLogger);

httpServer.listen(process.env.PORT, () => {
    console.log(`Server is running on http://localhost:${process.env.PORT}`);
});