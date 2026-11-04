// Personal project adaptation: credentials are accepted from environment only.
const fs = require("fs");
const crypto = require("crypto");
const WebSocket = require("ws");

const URL = "wss://openspeech.bytedance.com/api/v3/tts/bidirection";

const MsgType = {
  FullClientRequest: 0b0001,
  AudioOnlyServer: 0b1011,
  FullServerResponse: 0b1001,
  Error: 0b1111,
};

const Flag = {
  NoSeq: 0,
  WithEvent: 0b0100,
};

const EventType = {
  StartConnection: 1,
  FinishConnection: 2,
  ConnectionStarted: 50,
  ConnectionFailed: 51,
  ConnectionFinished: 52,
  StartSession: 100,
  FinishSession: 102,
  SessionStarted: 150,
  SessionFinished: 152,
  SessionFailed: 153,
  TaskRequest: 200,
  TTSSentenceStart: 350,
  TTSSentenceEnd: 351,
  TTSResponse: 352,
  TTSSubtitle: 364,
};

function readArg(name, fallback = "") {
  const idx = process.argv.indexOf(name);
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

function writeU32(value) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(value);
  return b;
}

function writeI32(value) {
  const b = Buffer.alloc(4);
  b.writeInt32BE(value);
  return b;
}

function marshal({ type, flag = Flag.NoSeq, event = 0, sessionId = "", payload = Buffer.from("{}") }) {
  const header = Buffer.from([
    (1 << 4) | 1,
    (type << 4) | flag,
    (1 << 4) | 0,
    0,
  ]);

  const chunks = [header];
  if (flag === Flag.WithEvent) {
    chunks.push(writeI32(event));
    if (![EventType.StartConnection, EventType.FinishConnection].includes(event)) {
      const sid = Buffer.from(sessionId);
      chunks.push(writeU32(sid.length), sid);
    }
  }
  chunks.push(writeU32(payload.length), payload);
  return Buffer.concat(chunks);
}

function readSizedString(buffer, offset) {
  const size = buffer.readUInt32BE(offset);
  const start = offset + 4;
  return { value: buffer.slice(start, start + size).toString("utf8"), offset: start + size };
}

function unmarshal(data) {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const type = buffer[1] >> 4;
  const flag = buffer[1] & 0b1111;
  let offset = (buffer[0] & 0b1111) * 4;
  let event = 0;
  let sessionId = "";
  let connectId = "";
  let errorCode = 0;

  if (type === MsgType.Error) {
    errorCode = buffer.readUInt32BE(offset);
    offset += 4;
  }

  if (flag === Flag.WithEvent) {
    event = buffer.readInt32BE(offset);
    offset += 4;
    if (![EventType.StartConnection, EventType.FinishConnection, EventType.ConnectionStarted, EventType.ConnectionFailed, EventType.ConnectionFinished].includes(event)) {
      const parsed = readSizedString(buffer, offset);
      sessionId = parsed.value;
      offset = parsed.offset;
    }
    if ([EventType.ConnectionStarted, EventType.ConnectionFailed, EventType.ConnectionFinished].includes(event)) {
      const parsed = readSizedString(buffer, offset);
      connectId = parsed.value;
      offset = parsed.offset;
    }
  }

  const payloadSize = buffer.readUInt32BE(offset);
  offset += 4;
  const payload = buffer.slice(offset, offset + payloadSize);
  return { type, flag, event, sessionId, connectId, errorCode, payload };
}

function send(ws, event, sessionId, body) {
  ws.send(marshal({
    type: MsgType.FullClientRequest,
    flag: Flag.WithEvent,
    event,
    sessionId,
    payload: Buffer.from(JSON.stringify(body ?? {})),
  }));
}

function payloadText(message) {
  return message.payload.length ? message.payload.toString("utf8") : "";
}

async function main() {
  const apiKey = process.env.VOLCENGINE_TTS_API_KEY;
  if (!apiKey) throw new Error("Missing VOLCENGINE_TTS_API_KEY");

  const text = readArg("--text");
  const output = readArg("--output", "volcengine-bidirection.mp3");
  const resourceId = readArg("--resource-id", process.env.VOLCENGINE_TTS_RESOURCE_ID || "seed-tts-2.0");
  const speaker = readArg("--speaker", process.env.VOLCENGINE_TTS_SPEAKER || "zh_male_lanyinmianbao_uranus_bigtts");
  const format = readArg("--format", "pcm");
  const speechRate = Number(readArg("--speech-rate", "-2"));
  const sessionId = crypto.randomUUID();
  const connectId = crypto.randomUUID();
  const audio = [];

  if (!text) throw new Error("Missing --text");

  const ws = new WebSocket(URL, {
    headers: {
      "X-Api-Key": apiKey,
      "X-Api-Resource-Id": resourceId,
      "X-Api-Connect-Id": connectId,
      "X-Control-Require-Usage-Tokens-Return": "*",
    },
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timed out waiting for TTS")), 120000);

    ws.on("open", () => {
      send(ws, EventType.StartConnection, "", {});
    });

    ws.on("message", (data) => {
      const msg = unmarshal(data);
      if (msg.type === MsgType.Error) {
        reject(new Error(`TTS error ${msg.errorCode}: ${payloadText(msg)}`));
        return;
      }
      if (msg.event === EventType.ConnectionFailed || msg.event === EventType.SessionFailed) {
        reject(new Error(`TTS failed event=${msg.event}: ${payloadText(msg)}`));
        return;
      }
      if (msg.event === EventType.ConnectionStarted) {
        send(ws, EventType.StartSession, sessionId, {
          user: { uid: "azurex-video" },
          namespace: "BidirectionalTTS",
          req_params: {
            speaker,
            audio_params: {
              format,
              sample_rate: 24000,
              bit_rate: 128000,
              speech_rate: speechRate,
              loudness_rate: 0,
              enable_subtitle: false,
            },
            additions: JSON.stringify({
              disable_markdown_filter: true,
              disable_emoji_filter: true,
            }),
          },
        });
        return;
      }
      if (msg.event === EventType.SessionStarted) {
        send(ws, EventType.TaskRequest, sessionId, {
          user: { uid: "azurex-video" },
          namespace: "BidirectionalTTS",
          req_params: { text },
        });
        setTimeout(() => send(ws, EventType.FinishSession, sessionId, {}), 100);
        return;
      }
      if (msg.event === EventType.TTSResponse && msg.payload.length) {
        audio.push(msg.payload);
        return;
      }
      if (msg.type === MsgType.AudioOnlyServer && msg.payload.length) {
        audio.push(msg.payload);
        return;
      }
      if (msg.event === EventType.SessionFinished) {
        send(ws, EventType.FinishConnection, "", {});
        return;
      }
      if (msg.event === EventType.ConnectionFinished) {
        clearTimeout(timeout);
        ws.close();
        resolve();
      }
    });

    ws.on("unexpected-response", (_req, res) => {
      let body = "";
      res.on("data", chunk => { if (body.length < 4000) body += chunk.toString(); });
      res.on("end", () => {
        clearTimeout(timeout);
        const safe = body.split(apiKey).join("[REDACTED]");
        reject(new Error(`TTS HTTP ${res.statusCode}: ${safe}`));
      });
    });
    ws.on("error", reject);
    ws.on("close", () => {
      if (!audio.length) {
        clearTimeout(timeout);
        reject(new Error("Connection closed without audio"));
      }
    });
  });

  if (!audio.length) {
    throw new Error("TTS finished without audio");
  }
  fs.writeFileSync(output, Buffer.concat(audio));
  console.log(`done: ${output}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
