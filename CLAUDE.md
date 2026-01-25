# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bilibili Video Summarizer is a Chrome extension that provides AI-powered video summaries for Bilibili (B站) videos. It uses multimodal AI models to analyze video content and generate intelligent summaries.

## Development Commands

```bash
# Build for production
npm run build

# Development build with watch mode
npm run dev

# Run linter
npm run lint

# Run tests
npm test

# Run a single test file
npm test -- --testPathPattern=<test-name>
```

## Architecture

### Extension Structure

The extension follows Chrome Manifest V3 architecture with three main entry points:

- **background.js** - Service worker that handles API communication and core logic
- **content.js** - Content script injected into Bilibili video pages
- **popup.js** - Extension popup interface
- **options.js** - Settings page for API configuration

### Key Services

Located in `src/services/`:

- **bilibili-parser.js** (`BilibiliVideoParser`) - Extracts BV IDs, fetches video metadata from Bilibili API, and obtains video URLs (MP4/FLV format only, DASH is disabled)
- **multimodal-analysis.js** (`MultimodalAnalysisService`) - Handles video analysis using ModelScope's multimodal API (Qwen3-VL model)
- **error-handler.js** - Centralized error handling
- **storage.ts** - Chrome storage wrapper
- **modelService.ts** - Model API service layer

### Video Processing Flow

1. Content script detects Bilibili video page (`/video/*` with BV ID)
2. Extracts video info (title, owner, duration) from page DOM
3. User clicks "AI Summary" button
4. `BilibiliVideoParser.getVideoInfo(bvid)` fetches metadata from Bilibili API
5. `BilibiliVideoParser.getVideoUrls(aid, cid, qn)` retrieves video URLs (MP4/FLV, qn=64 for 720P)
6. `MultimodalAnalysisService.analyzeVideo()` sends video URL and prompt to AI model
7. Results displayed in modal dialog on the page

### Message Passing

All components communicate via Chrome runtime messaging:
- Content script -> Background: `ANALYZE_VIDEO`, `VIDEO_DETECTED`
- Popup -> Background: `ANALYZE_VIDEO`, `GET_STORAGE`, `SET_STORAGE`, `TEST_API_KEY`
- Background orchestrates parsing and analysis, returns results

### Configuration

Users configure via options page (`options.html`):
- API Key (required)
- API URL (default: `https://api-inference.modelscope.cn/v1`)
- Model ID (default: `Qwen/Qwen3-VL-8B-Instruct`)

Stored in `chrome.storage.sync`.

### TypeScript Services

TypeScript services in `src/services/` (*.ts files) are for testing and internal utilities:
- `storage.ts` - Chrome storage wrapper with tests
- `modelService.ts` - Model API layer with tests
- `videoExtractor.ts` and related - Video extraction utilities

These are compiled via webpack but the main extension logic uses ES modules.

### Testing

- Jest with ts-jest preset, jsdom environment
- Tests in `src/__tests__/`
- Coverage configured for `src/**/*.{ts,tsx}`
- Use `@testing-library/jest-dom` for DOM assertions

## Important Notes

- The extension only works on `*.bilibili.com/video/*` pages
- Video URLs use MP4/FLV format (DASH intentionally disabled for compatibility)
- Content script injects a floating "AI Summary" button on video pages
- Webpack transforms manifest paths from `src/` to root for production build
- Icons and styles are copied via CopyWebpackPlugin from `icons/` and `styles/` directories
