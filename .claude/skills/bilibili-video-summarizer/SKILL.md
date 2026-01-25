---
name: bilibili-video-summarizer
description: Chrome extension for AI-powered Bilibili video summarization. Use when working on this codebase for: adding features, fixing bugs, understanding architecture, running tests, building, or modifying the video analysis workflow. Covers Chrome Manifest V3 patterns, content script injection, message passing, multimodal AI integration, and webpack build process.
---

# Bilibili Video Summarizer

Chrome extension that provides AI-powered video summaries for Bilibili (B站) using multimodal AI models (Qwen3-VL).

## Quick Reference

```bash
# Build
npm run build          # Production build to dist/
npm run dev            # Development watch mode

# Quality
npm run lint           # ESLint
npm test               # Jest tests

# Load extension
# Chrome: Extensions → Developer mode → Load unpacked → dist/
```

## Core Architecture

### Manifest V3 Structure

```
dist/
├── manifest.json      # Chrome extension manifest
├── background.js      # Service worker (orchestrator)
├── content.js         # Injected into bilibili.com/video/*
├── popup.js           # Extension popup interface
├── options.js         # Settings page
├── popup.html
├── options.html
├── icons/
└── styles/
```

### Component Responsibilities

| Component | Role | Key Files |
|-----------|------|-----------|
| **Background** | Service worker, API orchestration, storage | `background.js` |
| **Content** | Page detection, UI injection, video info extraction | `content.js` |
| **Popup** | Quick access interface, history | `popup.js`, `popup.html` |
| **Options** | API key config, model settings | `options.js`, `options.html` |

### Service Layer

Located in `src/services/`:

- **bilibili-parser.js** - BV ID extraction, video metadata from Bilibili API, video URL retrieval (MP4/FLV format, fnval=0 disables DASH)
- **multimodal-analysis.js** - AI video analysis via ModelScope API (Qwen3-VL-8B-Instruct)
- **error-handler.js** - Centralized error handling
- **storage.ts** - Chrome storage wrapper (TypeScript)
- **modelService.ts** - Model API layer (TypeScript, tested)

## Video Processing Workflow

```
1. Content script detects Bilibili video page
   └─> Pattern: /video/* with BV ID

2. Extract video info from page DOM
   └─> Title, owner, duration, view count

3. User clicks "AI Summary" button
   └─> Floating button injected by content script

4. BilibiliVideoParser.getVideoInfo(bvid)
   └─> Fetches: aid, pages[], owner, stats

5. BilibiliVideoParser.getVideoUrls(aid, cid, qn=64)
   └─> Returns: MP4/FLV URLs (720P)

6. MultimodalAnalysisService.analyzeVideo(videoData)
   └─> POST to ModelScope API with video URL + prompt

7. Display results in modal
```

## Message Passing

All Chrome runtime messaging uses `action` field:

```javascript
// Content/Popup → Background
chrome.runtime.sendMessage({
  action: 'ANALYZE_VIDEO',
  data: { videoData, analysisType }
}, response);

// Actions
'PARSE_VIDEO'          // Parse Bilibili URL
'ANALYZE_VIDEO'        // Run AI analysis
'VIDEO_DETECTED'       // Notify video page found
'GET_STORAGE'          // Read chrome.storage.sync
'SET_STORAGE'          // Write chrome.storage.sync
'TEST_API_KEY'         // Validate API connection
```

## Common Development Tasks

### Adding a New Feature

1. Identify component layer (background/content/popup)
2. Add message handler in `background.js` switch statement
3. Update `manifest.json` if new permissions needed
4. Add TypeScript types to `src/types/index.ts` if applicable
5. Run `npm run lint` before committing

### Debugging Content Script

```javascript
// In browser console on bilibili.com/video/*
console.log('Current video info:', window.currentVideoInfo);

// Check button injection
document.querySelector('.bilibili-summary-btn');

// View background logs
// chrome://extensions → Service worker → inspect
```

### Modifying Analysis Prompts

Edit `src/services/multimodal-analysis.js`:

```javascript
buildAnalysisPrompt(videoData, analysisType) {
  // Prompts for: general, technical, educational, entertainment, summary
}
```

### Testing

```bash
# Run all tests
npm test

# Run single test file
npm test -- --testPathPattern=storageService

# Watch mode
npm test -- --watch
```

Tests located in `src/__tests__/`:
- `storageService.test.ts` - Chrome storage wrapper
- `modelService.test.ts` - Model API layer
- `videoExtractor.test.ts` - Video extraction

## Configuration

Default settings (user can override in options page):

```javascript
apiKey: ''              // Required - user provides
apiUrl: 'https://api-inference.modelscope.cn/v1'
modelId: 'Qwen/Qwen3-VL-8B-Instruct'
maxTokens: 1000
temperature: 0.7
```

Stored in `chrome.storage.sync`.

## Webpack Build Notes

- Entry points: popup, background, content, options
- HTML templates auto-injected with HtmlWebpackPlugin
- Manifest paths transformed from `src/` to root during build
- Icons and styles copied via CopyWebpackPlugin

## Key Implementation Details

- **Video format**: MP4/FLV only (DASH disabled via `fnval=0`)
- **Content Security**: Manifest V3 CSP, no eval/inline scripts
- **Bilibili API**: Uses public endpoints (no auth required for video info)
- **Multi-part videos**: Handled via loop in `bilibili-parser.js`
- **Error handling**: Centralized in `error-handler.js`

## References

For detailed architecture and API flow, see:
- [references/architecture.md](references/architecture.md) - Component relationships
- [references/api-flow.md](references/api-flow.md) - Complete video processing pipeline
