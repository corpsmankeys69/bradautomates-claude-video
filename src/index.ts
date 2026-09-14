#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { YoutubeTranscript } from "youtube-transcript";
import { z } from "zod";

function extractVideoId(input: string): string {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    if (url.hostname === "youtu.be") {
      return url.pathname.slice(1);
    }
    if (url.hostname.endsWith("youtube.com")) {
      const v = url.searchParams.get("v");
      if (v) return v;
      const shortsMatch = url.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
      if (shortsMatch) return shortsMatch[1];
      const embedMatch = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
      if (embedMatch) return embedMatch[1];
    }
  } catch {
    // not a URL, fall through
  }

  throw new Error(`Could not extract a YouTube video ID from "${input}"`);
}

function formatTimestamp(seconds: number): string {
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

const server = new McpServer({
  name: "bradautomates-claude-video",
  version: "1.0.0",
});

server.registerTool(
  "get_youtube_transcript",
  {
    title: "Get YouTube Transcript",
    description:
      "Fetch the transcript/captions of a YouTube video so Claude can read what was said. " +
      "Accepts a full YouTube URL (watch, youtu.be, shorts, embed) or a bare 11-character video ID.",
    inputSchema: {
      video: z
        .string()
        .describe("YouTube URL or video ID, e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
      lang: z
        .string()
        .optional()
        .describe("Preferred caption language code, e.g. 'en'. Defaults to the video's default track."),
      includeTimestamps: z
        .boolean()
        .optional()
        .describe("Prefix each line with its timestamp (default: true)."),
    },
  },
  async ({ video, lang, includeTimestamps = true }) => {
    const videoId = extractVideoId(video);

    let entries;
    try {
      entries = await YoutubeTranscript.fetchTranscript(videoId, lang ? { lang } : undefined);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [
          {
            type: "text",
            text: `Failed to fetch transcript for video "${videoId}": ${message}`,
          },
        ],
        isError: true,
      };
    }

    if (!entries.length) {
      return {
        content: [{ type: "text", text: `No transcript/captions available for video "${videoId}".` }],
        isError: true,
      };
    }

    const text = entries
      .map((e) => (includeTimestamps ? `[${formatTimestamp(e.offset / 1000)}] ${e.text}` : e.text))
      .join("\n");

    return {
      content: [
        {
          type: "text",
          text: `Transcript for https://www.youtube.com/watch?v=${videoId} (${entries.length} lines):\n\n${text}`,
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error starting MCP server:", err);
  process.exit(1);
});
