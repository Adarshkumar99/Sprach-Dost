/**
 * Minimal Microsoft Edge neural TTS WebSocket client (server-side).
 *
 * Replaces node-edge-tts, which broke in October 2026 when Microsoft made
 * Sec-MS-GEC v2 tokens mandatory. Protocol mirrors the reference Python
 * implementation (rany2/edge-tts): connect to the readaloud/edge/v1 endpoint
 * with a v2 DRM token, send speech.config + SSML, collect binary audio
 * messages until turn.end.
 */

import crypto from "crypto";
import WebSocket from "ws";
import { generateSecMsGecV2, SEC_MS_GEC_VERSION, TRUSTED_CLIENT_TOKEN } from "./edgeDrm";

const WSS_URL = "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1";
const OUTPUT_FORMAT = "audio-24khz-48kbitrate-mono-mp3";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0";

/* JS-style date string in UTC, e.g. "Sat Oct 25 2026 10:00:00 GMT+0000 (Coordinated Universal Time)" */
function dateToString(): string {
  const d = new Date();
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const p = (n: number) => String(n).padStart(2, "0");
  return `${days[d.getUTCDay()]} ${months[d.getUTCMonth()]} ${p(d.getUTCDate())} ${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} GMT+0000 (Coordinated Universal Time)`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function connectId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export type EdgeTtsOptions = {
  voice: string;
  lang?: string;
  /** speaking-rate percentage string, e.g. "-15%" or "+0%" */
  rate?: string;
  /** pitch string, e.g. "+0Hz" */
  pitch?: string;
  timeoutMs?: number;
};

/**
 * Synthesize `text` (max ~1200 chars) to an MP3 Buffer.
 * Returns null on any failure so callers can fall back.
 */
export async function edgeTtsBuffer(text: string, opts: EdgeTtsOptions): Promise<Buffer | null> {
  return new Promise((resolve) => {
    let settled = false;
    const chunks: Buffer[] = [];

    const url =
      `${WSS_URL}?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}` +
      `&ConnectionId=${connectId()}` +
      `&Sec-MS-GEC=${generateSecMsGecV2()}` +
      `&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(url, {
        headers: {
          Pragma: "no-cache",
          "Cache-Control": "no-cache",
          Origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
          "User-Agent": USER_AGENT,
          "Accept-Encoding": "gzip, deflate, br, zstd",
          "Accept-Language": "en-US,en;q=0.9",
          Cookie: `muid=${crypto.randomBytes(16).toString("hex").toUpperCase()};`,
        },
        perMessageDeflate: true,
      });
    } catch {
      resolve(null);
      return;
    }

    const timeout = setTimeout(() => {
      try {
        ws.terminate();
      } catch {
        /* noop */
      }
      settle(false);
    }, opts.timeoutMs ?? 15000);

    function settle(ok: boolean) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try {
        ws.close();
      } catch {
        /* noop */
      }
      const buf = ok && chunks.length > 0 ? Buffer.concat(chunks) : null;
      resolve(buf && buf.length > 500 ? buf : null);
    }

    ws.on("open", () => {
      ws.send(
        `X-Timestamp:${dateToString()}\r\n` +
          "Content-Type:application/json; charset=utf-8\r\n" +
          "Path:speech.config\r\n\r\n" +
          `{"context":{"synthesis":{"audio":{"metadataoptions":{` +
          `"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"true"` +
          `},"outputFormat":"${OUTPUT_FORMAT}"}}}}\r\n`
      );
      const rate = opts.rate ?? "+0%";
      const pitch = opts.pitch ?? "+0Hz";
      const ssml =
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>" +
        `<voice name='${opts.voice}'>` +
        `<prosody pitch='${pitch}' rate='${rate}' volume='+0%'>` +
        escapeXml(text) +
        "</prosody></voice></speak>";
      ws.send(
        `X-RequestId:${connectId()}\r\n` +
          "Content-Type:application/ssml+xml\r\n" +
          `X-Timestamp:${dateToString()}Z\r\n` +
          "Path:ssml\r\n\r\n" +
          ssml
      );
    });

    ws.on("message", (data: Buffer, isBinary: boolean) => {
      if (settled) return;
      if (!isBinary) {
        if (data.includes("Path:turn.end")) settle(true);
        return;
      }
      if (data.length < 2) return;
      const headerLen = data.readUInt16BE(0);
      if (headerLen > data.length) return;
      const headers = data.subarray(2, headerLen).toString("ascii");
      if (!headers.includes("Path:audio")) return;
      const payload = data.subarray(headerLen + 2);
      if (payload.length > 0) chunks.push(payload);
    });

    ws.on("error", () => settle(false));
    ws.on("close", () => settle(chunks.length > 0));
  });
}
