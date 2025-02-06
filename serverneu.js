const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const grandiose = require("grandiose");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static("public"));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Funktion zum Starten des NDI-Streams
async function startNDIStream(ws) {
    const sources = await grandiose.find();
    
    if (sources.length === 0) {
        console.error("❌ Keine NDI-Quellen gefunden.");
        return;
    }

    const selectedSource = sources[0].name;
    console.log("✅ Verwende NDI-Quelle:", selectedSource);

    const ndiReceiver = await grandiose.receive({ 
        source: selectedSource, 
        allowVideo: true, 
        colorFormat: grandiose.ColorFormat.BGRA // Alternativen: RGBA, UYVY
    });

    console.log("🎥 NDI-Stream gestartet!");

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
            frame.free(); // Speicher für Frame freigeben
        }
    } catch (error) {
        console.error("Fehler beim Empfangen des NDI-Streams:", error);
    } finally {
        ndiReceiver.free(); // NDI-Receiver sauber beenden
    }
}

// WebSocket-Handler
wss.on("connection", (ws) => {
    console.log("🌍 Neuer WebSocket-Client verbunden.");

    const stream = startNDIStream(ws);

    ws.on("close", () => {
        console.log("❌ WebSocket-Client getrennt.");
        stream.then(receiver => receiver && receiver.free()); // Sicherstellen, dass der Stream beendet wird
    });
});

server.listen(3000, () => {
    console.log("🚀 Server läuft auf http://localhost:3000");
    grandiose.find().then(sources => {
        console.log("📡 Verfügbare NDI-Quellen:");
        sources.forEach(source => console.log(source.name));
    });
});
