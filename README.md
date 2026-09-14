# bradautomates-claude-video

An MCP server that lets Claude read YouTube video transcripts. It exposes one tool,
`get_youtube_transcript`, which fetches the captions for a video so Claude can reason
about what was said without downloading or watching the video itself.

## Tool

### `get_youtube_transcript`

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `video` | string | yes | A YouTube URL (watch, `youtu.be`, `/shorts/`, `/embed/`) or a bare 11-character video ID |
| `lang` | string | no | Preferred caption language code (e.g. `en`) |
| `includeTimestamps` | boolean | no | Prefix each line with its timestamp (default: `true`) |

Returns the transcript as text, one line per caption entry.

## Setup

```bash
npm install
npm run build
```

## Use with Claude Code

```bash
claude mcp add bradautomates-claude-video -- node /absolute/path/to/bradautomates-claude-video/dist/index.js
```

## Use with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "bradautomates-claude-video": {
      "command": "node",
      "args": ["/absolute/path/to/bradautomates-claude-video/dist/index.js"]
    }
  }
}
```

## Notes

- Only fetches publicly available captions (manual or auto-generated). Videos with
  captions disabled will return an error.
- No YouTube API key required.
