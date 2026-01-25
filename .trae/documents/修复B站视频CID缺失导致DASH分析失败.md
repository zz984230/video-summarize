## 问题原因
- 报错源头：在 `src/services/dashToMp4Converter.ts:310` 对 `videoInfo.bvid` 或 `videoInfo.cid` 为空直接抛错，导致后续流程中断。
- CID提取不稳：`src/services/videoExtractor.ts:152` 仅从 URL 参数或 `window.__INITIAL_STATE__.videoData.cid` 读取，遇到多分P视频或页面结构变化时经常取不到。
- 典型场景：B站多分P视频的 `cid` 存在于 `data.pages[*].cid`，或需通过 `x/web-interface/view?bvid=...` API获取；当前实现未覆盖。

## 修复方案
1. 增强CID提取逻辑（前端内容脚本侧）
- 在 `videoExtractor.ts`：
  - 若 `cid` 为空，调用 `https://api.bilibili.com/x/web-interface/view?bvid=<BV>` 获取视频数据，优先根据 `p` 参数选择对应 `pages[p-1].cid`，否则取 `data.cid` 或首页 `pages[0].cid`。
  - 将 `cid` 统一以字符串形式存入 `VideoInfo.cid`。
- 保持 `bvid` 提取逻辑不变，但增强正则健壮性（继续使用现有）。

2. DASH分析入口自动补全CID（后台分析侧）
- 在 `dashToMp4Converter.ts:306-314` 的 `EnhancedVideoAnalyzerPro.analyzeWithDashStream`：
  - 若 `videoInfo.cid` 缺失，自动调用备用获取：
    - 优先使用已有工具 `VideoStreamExtractor.getCompleteStreamInfo(bvid)` 或其内部的 `BiliUrl.getCid(bvid)`；
    - 若仍失败，调用 `x/web-interface/view?bvid=<BV>` 获取 `cid`；
  - 若最终仍不可得，直接走 `analyzeWithFallback`，不抛错中断。

3. 兼容多分P与跳转参数
- 解析 URL 的 `p` 参数并选择对应分P的 `cid`。
- `cleanUrl` 保留 `p` 参数（现有逻辑已保留）。

## 代码改动点
- `src/services/videoExtractor.ts`
  - 增强 `extractCid`：增加 API 兜底；支持 `pages[p-1].cid`；输出统一字符串。
  - 保持 `extractBvid` 与 `cleanUrl` 逻辑。
- `src/services/dashToMp4Converter.ts`
  - 修改 `EnhancedVideoAnalyzerPro.analyzeWithDashStream`：缺失 `cid` 时自动补全；失败时走封面/文本降级，不再 `throw`。
- 不需改动 `popup/App.tsx` 与内容脚本消息通道。

## 验证步骤
- 用用户提供链接 `https://www.bilibili.com/video/BV17oUrBKE7h/`：
  - 在扩展中点击“生成摘要”，应不再出现“缺少BV号或CID信息”。
  - 观察日志：应显示通过 `view` 接口或 `BiliUrl` 成功获取 `cid`。
  - DASH转换成功后，能进入VL分析；若VL失败，封面降级与文本分析正常触发。
- 额外用多分P视频（带 `?p=2` 等）和单分P视频进行回归测试。

## 风险与兼容
- B站API可能存在速率限制：已保持 `User-Agent/Referer` 头，失败时有降级。
- 多分P页结构差异：优先按 `p` 参数选择 `pages[p-1].cid`，未提供则取首页。
- 若用户未登录或区域限制：无法获取流时自动降级到封面/文本分析。

## 回退与监控
- 所有网络失败场景均已设计降级路径（封面→文本）。
- 保留现有日志输出，便于后续定位问题。

请确认以上方案，确认后我将实施具体代码改动并进行端到端验证。