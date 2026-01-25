# API Flow Reference

## Complete Video Processing Pipeline

### 1. Page Detection (content.js)

```javascript
// Trigger: User navigates to bilibili.com/video/BV*
checkVideoPage() {
  const currentUrl = window.location.href;
  const isVideoPage = currentUrl.includes('/video/') && currentUrl.includes('BV');
  if (isVideoPage && this.currentVideoUrl !== currentUrl) {
    this.onVideoPageDetected(currentUrl);
  }
}
```

**Outputs:**
- `currentVideoInfo` object with basic page data

### 2. Video Info Extraction (content.js → DOM)

```javascript
extractVideoInfo() {
  return {
    bvid: this.parser.extractBV(window.location.href),
    title: this.getVideoTitle(),
    owner: this.getVideoOwner(),
    duration: this.getVideoDuration(),
    view: this.getVideoViews(),
    pages: this.getVideoPages(),
    url: window.location.href
  };
}
```

**DOM Selectors Used:**
- Title: `h1.video-title`, `.video-title h1`, `[data-title]`, `h1`
- Owner: `.user-name`, `.username`, `.up-name`, `[data-name]`
- Duration: `meta[property="og:video:duration"]` or from page scripts

### 3. Bilibili API: Get Video Info (bilibili-parser.js)

```javascript
// Endpoint: https://api.bilibili.com/x/web-interface/view?bvid={bvid}
async getVideoInfo(bvid) {
  const response = await fetch(`${this.baseApiUrl}?bvid=${bvid}`);
  const data = await response.json();
  return {
    aid: data.data.aid,
    bvid: data.data.bvid,
    title: data.data.title,
    desc: data.data.desc,
    pic: data.data.pic,
    pages: [{ cid, part, duration, page }],
    owner: { mid, name, face },
    duration: data.data.duration,
    view: data.data.stat.view,
    // ... more stats
  };
}
```

**API Response Structure:**
```javascript
{
  code: 0,
  data: {
    aid: 123456789,
    bvid: "BV1xx411c7mD",
    title: "视频标题",
    owner: { mid: 0, name: "UP主", face: "url" },
    pages: [
      { cid: 0, page: 1, part: "P1", duration: 120 }
    ],
    stat: { view: 1000, danmaku: 50, reply: 10, ... }
  }
}
```

### 4. Bilibili API: Get Video URLs (bilibili-parser.js)

```javascript
// Endpoint: https://api.bilibili.com/x/player/playurl
async getVideoUrls(aid, cid, qn = 64) {
  const params = {
    avid: aid,
    cid: cid,
    qn: qn,           // 64 = 720P
    fnval: 0,         // 0 = FLV/MP4, 16 = DASH
    platform: 'html5'
  };
  const response = await fetch(`${this.playUrlApi}?${params}`);
  const data = await response.json();
  return data.data.durl.map(item => ({
    url: item.url,
    size: item.size,
    length: item.length
  }));
}
```

**Key Parameters:**
- `qn`: Quality (16=360P, 32=480P, 64=720P, 80=1080P)
- `fnval`: Format (0=FLV/MP4, 16=DASH)

**Response (MP4/FLV):**
```javascript
{
  code: 0,
  data: {
    durl: [
      { url: "https://...", size: 12345678, length: 120, order: 1 }
    ]
  }
}
```

### 5. AI Analysis Request (multimodal-analysis.js)

```javascript
// Endpoint: https://api-inference.modelscope.cn/v1/chat/completions
async analyzeVideo(videoData, analysisType = 'general') {
  const prompt = this.buildAnalysisPrompt(videoData, analysisType);
  const requestBody = {
    model: 'Qwen/Qwen3-VL-8B-Instruct',
    messages: [{
      role: 'user',
      content: [
        { type: 'video_url', video_url: videoData.videoUrl },
        { type: 'text', text: prompt }
      ]
    }],
    max_tokens: 1000,
    temperature: 0.7
  };

  const response = await fetch(`${this.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  const data = await response.json();
  return data.choices[0].message.content;
}
```

### 6. Analysis Prompt Templates

```javascript
buildAnalysisPrompt(videoData, analysisType) {
  const baseInfo = {
    title: videoData.title,
    owner: videoData.owner,
    duration: this.formatDuration(videoData.duration),
    view: videoData.view
  };

  const prompts = {
    general: `请详细分析这个视频的内容...`,
    technical: `请从技术角度分析这个视频...`,
    educational: `请分析这个视频的教育价值...`,
    entertainment: `请分析这个视频的娱乐价值...`,
    summary: `请为这个视频生成简洁的摘要...`
  };

  return prompts[analysisType] || prompts.general;
}
```

## Message Flow Sequence Diagram

```
User Clicks "AI Summary"
       │
       ▼
┌─────────────────┐
│   content.js    │
│                 │
│ 1. getVideoInfo() │───────────┐
│    from Bilibili API        │
│ 2. getVideoUrls() │──────────┤
│    from Bilibili API        │
│ 3. Send to background        │
└────────┬────────┘
         │ chrome.runtime.sendMessage
         │ { action: 'ANALYZE_VIDEO', data: {...} }
         ▼
┌─────────────────┐
│ background.js   │
│                 │
│ 1. Get API key  │───────────┐
│    from storage           │
│ 2. Call analysis service │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ MultimodalAnalysisService   │
│                             │
│ 1. Build prompt             │
│ 2. Fetch ModelScope API     │─────────────────┐
│ 3. Return result            │                 │
└────────┬────────┘            │
         │                     │
         │ sendResponse        │ ModelScope API
         ▼                     ▼
┌─────────────────┐    ┌──────────────────┐
│   content.js    │    │  Qwen3-VL Model  │
│                 │    │  (AI Analysis)   │
│ Display result  │    └──────────────────┘
│ in modal        │
└─────────────────┘
```

## Error Handling Flow

```javascript
try {
  // Each layer catches and logs errors
} catch (error) {
  console.error('❌ [Component] Operation failed:', error);
  return {
    success: false,
    error: error.message
  };
}
```

**Error Logging Pattern:**
- Prefix emoji: `🎬`, `📹`, `✅`, `❌`
- Component name in brackets
- Operation description
- Error details
