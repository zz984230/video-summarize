# Architecture Reference

## Component Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Chrome Browser                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐      ┌─────────────────┐                   │
│  │   Popup /       │      │   Options /     │                   │
│  │   popup.js      │      │   options.js    │                   │
│  │   popup.html    │      │   options.html  │                   │
│  └────────┬────────┘      └────────┬────────┘                   │
│           │                        │                             │
│           └────────────┬───────────┘                             │
│                        │ chrome.runtime.sendMessage             │
│           ┌────────────▼────────────┐                            │
│           │   background.js         │                            │
│           │   (Service Worker)      │                            │
│           └────────────┬────────────┘                            │
│                        │                                        │
│           ┌────────────▼────────────┐                            │
│           │  Services Layer         │                            │
│           │  ├── bilibili-parser.js │                            │
│           │  └── multimodal-...js   │                            │
│           └────────────┬────────────┘                            │
│                        │                                        │
│  ┌─────────────────────┼─────────────────────────────────┐      │
│  │                     │                                 │      │
│  │  ┌──────────────────▼──────────────┐                  │      │
│  │  │  content.js                      │                  │      │
│  │  │  (Injected into bilibili.com)   │                  │      │
│  │  └─────────────────────────────────┘                  │      │
│  │                                                           │      │
│  │  ┌──────────────────────────────────────────────────┐  │      │
│  │  │         Bilibili Video Page                       │  │      │
│  │  │  ┌────────────────────────────────────────────┐  │  │      │
│  │  │  │  DOM: .bilibili-summary-btn (injected)     │  │  │      │
│  │  │  │  Modal: .analysis-modal                    │  │  │      │
│  │  │  └────────────────────────────────────────────┘  │  │      │
│  │  └──────────────────────────────────────────────────┘  │      │
│  └─────────────────────────────────────────────────────────┘      │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘

                         External APIs
┌─────────────────────────────────────────────────────────────────┐
│                                                                   │
│  ┌────────────────────┐      ┌────────────────────┐             │
│  │  Bilibili API      │      │  ModelScope API    │             │
│  │  - Video metadata  │      │  - AI analysis     │             │
│  │  - Playback URLs   │      │  - Qwen3-VL model  │             │
│  └────────────────────┘      └────────────────────┘             │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## File Organization

### Entry Points (Webpack)

| Entry | Source | Output | Purpose |
|-------|--------|--------|---------|
| popup | src/popup.js | dist/popup.js | Extension popup UI |
| background | src/background.js | dist/background.js | Service worker |
| content | src/content.js | dist/content.js | Page injection |
| options | src/options.js | dist/options.js | Settings page |

### Services Directory Structure

```
src/services/
├── bilibili-parser.js       # ES6 class - Bilibili API client
├── multimodal-analysis.js   # ES6 class - AI model client
├── error-handler.js         # Error utilities
├── storage.ts               # TypeScript - Chrome storage wrapper
├── modelService.ts          # TypeScript - Model API client
├── videoExtractor.ts        # TypeScript - Video extraction utils
├── videoProxyService.ts     # TypeScript - Video proxy handling
├── videoStreamExtractor.ts  # TypeScript - Stream extraction
├── videoFrameExtractor.ts   # TypeScript - Frame extraction
└── dashToMp4Converter.ts    # TypeScript - DASH conversion
└── biliUrl.ts              # TypeScript - URL parsing utilities
```

## Chrome Extension Patterns

### Manifest V3 Key Points

```javascript
// src/manifest.json
{
  "manifest_version": 3,
  "background": {
    "service_worker": "background.js"  // Not persistent
  },
  "content_scripts": [
    {
      "matches": ["*://*.bilibili.com/video/*"],
      "js": ["services/error-handler.js", "content/content.js"],
      "run_at": "document_end"
    }
  ],
  "permissions": ["tabs", "activeTab", "storage", "contextMenus"],
  "host_permissions": [
    "*://*.bilibili.com/*",
    "*://api-inference.modelscope.cn/*"
  ]
}
```

### Service Worker Lifecycle

- **Not persistent** - wakes on events, sleeps after
- **No DOM access** - use content scripts for page manipulation
- **Message response** - must return `true` for async responses

### Content Script Injection

```javascript
// Injected via manifest, runs in page context
// Can access DOM, but isolated from page JS
```

## State Management

### Chrome Storage Usage

| Storage Type | Purpose | Example |
|--------------|---------|---------|
| chrome.storage.sync | User settings, API keys | apiKey, apiUrl, modelId |
| chrome.storage.local | History, cache | summaryHistory |

### Message Response Pattern

```javascript
// Background.js - MUST return true for async
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleAsync().then(result => sendResponse(result));
  return true; // Keep channel open
});
```

## TypeScript vs JavaScript

- **Main extension logic**: ES6 modules (.js) - compiled by webpack
- **Tested utilities**: TypeScript (.ts) - compiled by ts-loader
- **Types defined in**: src/types/index.ts
