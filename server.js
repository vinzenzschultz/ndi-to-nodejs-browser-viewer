const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const grandiose = require("grandiose");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const path = require("path");

// Statische Dateien aus dem aktuellen Verzeichnis bereitstellen
app.use(express.static(path.join(__dirname, "public")));

// Standard-Route für `/`
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});


async function startNDIStream(ws) {
    console.log("NDI-Stream wird empfangen...");

    const grandiose = require('grandiose');
    let source = { name: "UUN (NVIDIA GeForce RTX 4060 Ti 1)", urlAddress: "192.168.1.93" };

    let ndiReceiver = await grandiose.receive({ source: source });

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
    grandiose.find().then(sources => {
        console.log("Verfügbare NDI-Quellen:");
        sources.forEach(source => console.log(source.name));
    });
});

