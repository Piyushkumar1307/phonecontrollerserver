const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

console.log("Server running");

wss.on("connection", (ws) => {

    console.log("Connected");

    ws.on("message", (message) => {

        wss.clients.forEach(client => {

            if(client.readyState === WebSocket.OPEN)
                client.send(message.toString());

        });

    });

});