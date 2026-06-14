const WebSocket = require("ws");
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the built React app
app.use(express.static(path.join(__dirname, "PhoneController/dist")));

// Serve index.html for all routes (SPA routing)
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "PhoneController/dist/index.html"));
});

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// WebSocket server on the same HTTP server
const wss = new WebSocket.Server({ server });

console.log("WebSocket server ready");

wss.on("connection", (ws) => {

    console.log("Connected");

    ws.on("message", (message) => {

        wss.clients.forEach(client => {

            if(client.readyState === WebSocket.OPEN)
                client.send(message.toString());

        });

    });

});