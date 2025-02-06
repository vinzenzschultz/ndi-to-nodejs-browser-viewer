const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const grandiose = require("grandiose");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

async function startNDIStream(ws) {
    console.log("NDI-Stream wird empfangen...");

    const ndiReceiver = await grandiose.receive({
        source: "NDI_SOURCE_NAME", // Ersetze mit deinem NDI-Stream-Namen
        allowVideo: true,
        allowAudio: false,
        colorFormat: grandiose.ColorFormat.UYVY
    });

    while (true) {
        const frame = await ndiReceiver.video();
        if (!frame || ws.readyState !== WebSocket.OPEN) break;
        ws.send(frame.data);
    }
}

wss.on("connection", (ws) => {
    console.log("Neuer WebSocket-Client verbunden");
    startNDIStream(ws);

    ws.on("close", () => {
        console.log("WebSocket-Client getrennt");
    });
});

server.listen(3000, () => {
    console.log("Server läuft auf http://localhost:3000");
});
