const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const grandiose = require("grandiose");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const path = require("path");

// Statische Dateien aus dem aktuellen Verzeichnis bereitstellen
//app.use(express.static(path.join(__dirname, "public")));
app.use(express.static("public"));

// Standard-Route für `/`
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});


async function startNDIStream(ws) {
    const sources = await grandiose.find();
    
    if (sources.length === 0) {
        console.error("Keine NDI-Quellen gefunden! Starte eine NDI-Quelle im Netzwerk.");
        return;
    }

    // Die erste verfügbare NDI-Quelle verwenden
    const selectedSource = sources[0].name;

    let source = { name: "ZGR-ENC05 (Stream1)", urlAddress: "192.168.1.93" };
    console.log("Verwende NDI-Quelle:", sources[0]);

    const ndiReceiver = await grandiose.receive({ source: sources[0], allowVideo: true, colorFormat: grandiose.COLOR_FORMAT_RGBX_RGBA });

    console.log("NDI-Stream gestartet!");
    
    let lastFrameTime = Date.now();
    const frameRateLimit = 30; // Maximal 30 FPS

    try {
    while (ws.readyState === WebSocket.OPEN) {
            const now = Date.now();
            const elapsedTime = now - lastFrameTime;

            if (elapsedTime < 1000 / frameRateLimit) {
                await new Promise(resolve => setTimeout(resolve, 5));
                continue;
            }

            const frame = await ndiReceiver.video();
            if (!frame) continue;
    
            lastFrameTime = now;

            ws.send(frame.data);
        }
    } catch (error) {
        console.error("Fehler beim Empfangen des NDI-Streams:", error);
    }
}


wss.on("connection", (ws) => {
    console.log("Neuer WebSocket-Client verbunden.");
    
    startNDIStream(ws).catch((error) => {
        console.error("Fehler beim Starten des NDI-Streams:", error);
    });

    ws.on("close", () => {
        console.log("WebSocket-Client getrennt.");
        stream.then(receiver => receiver && receiver.free()); // Sicherstellen, dass der Stream beendet wird
    });
});

server.listen(3000, () => {
    console.log("Server läuft auf http://localhost:3000");
    grandiose.find().then(sources => {
        console.log("Verfügbare NDI-Quellen:");
        sources.forEach(source => console.log(source.name));
    });
});

