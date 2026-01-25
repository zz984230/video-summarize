# 🧪 MCP 测试命令

## ⚠️ 重要：需要先重启 Claude Code！

MCP 服务器已配置完成，但需要**重启 Claude Code** 才能生效。

---

## 🚀 重启后使用以下命令

### 命令 1: 完整功能测试

```
请使用 extension-tester MCP 服务器帮我完整测试 Bilibili 视频总结扩展的流式分析功能：

**步骤 1**: 启动浏览器
- extensionPath: "D:\\code\\video-summarize\\dist"
- headless: false

**步骤 2**: 配置扩展 API
- apiKey: "519c90dbdfc44c2cb839c6b52195fd3a.hJBSKOskvOz4hSJG"
- apiUrl: "https://open.bigmodel.cn/api/paas/v4"
- modelId: "glm-4.6v-flash"

**步骤 3**: 访问测试视频
- url: "https://www.bilibili.com/video/BV1NwrTB8EGQ"
- waitForSelector: ".bilibili-summary-btn"

**步骤 4**: 截图（初始状态）

**步骤 5**: 点击"AI摘要"按钮
- selector: ".bilibili-summary-btn"

**步骤 6**: 等待模态框出现
- selector: ".stream-modal"
- timeout: 10000

**步骤 7**: 监控流式内容增长
每 15 秒执行一次以下脚本，共 3 次（45秒）：
  const content = document.querySelector('#streamContent');
  const statusBadge = document.querySelector('.status-badge');
  return {
    timestamp: new Date().toISOString(),
    contentLength: content?.textContent?.length || 0,
    preview: content?.textContent?.substring(0, 100) || 'empty',
    status: statusBadge?.textContent
  };

**步骤 8**: 检查最终状态
执行脚本：
  const statusBadge = document.querySelector('.status-badge');
  const title = document.querySelector('.modal-header h3');
  const copyBtn = document.querySelector('.copy-btn');
  const content = document.querySelector('#streamContent');
  return {
    isCompleted: statusBadge?.classList.contains('completed'),
    statusText: statusBadge?.textContent,
    title: title?.textContent,
    copyEnabled: !copyBtn?.disabled,
    totalLength: content?.textContent?.length || 0,
    fullContent: content?.textContent || ''
  };

**步骤 9**: 截图（最终状态）

**步骤 10**: 获取控制台日志
- clear: true

**步骤 11**: 关闭浏览器

请生成详细的测试报告，包括所有步骤的执行结果和截图。
```

---

### 命令 2: 快速功能验证

```
使用 extension-tester 快速验证扩展基础功能：

1. launch_browser: extensionPath = "D:\\code\\video-summarize\\dist", headless = false
2. navigate_to: url = "https://www.bilibili.com/video/BV1NwrTB8EGQ", waitForSelector = ".bilibili-summary-btn"
3. take_screenshot
4. execute_script: return document.querySelector('.bilibili-summary-btn') ? '按钮存在' : '按钮不存在'
5. close_browser

告诉我按钮是否成功出现。
```

---

### 命令 3: 流式内容测试

```
测试流式分析功能，重点是内容实时显示：

1. 启动浏览器：D:\\code\\video-summarize\\dist
2. 配置 API：519c90dbdfc44c2cb839c6b52195fd3a.hJBSKOskvOz4hSJG
3. 访问视频：https://www.bilibili.com/video/BV1NwrTB8EGQ
4. 点击 .bilibili-summary-btn 按钮
5. 等待 .stream-modal 出现
6. 每 10 秒记录一次内容长度，持续 60 秒
7. 生成时间-内容长度数据表
8. 最终截图并获取完整内容
9. 关闭浏览器
```

---

### 命令 4: 错误处理测试

```
测试扩展的错误处理能力：

1. 启动浏览器：D:\\code\\video-summarize\\dist
2. 不要配置 API（清空配置）
3. 访问视频：https://www.bilibili.com/video/BV1NwrTB8EGQ
4. 点击按钮
5. 等待 5 秒
6. 截图
7. 获取控制台日志
8. 检查是否显示"请先配置API密钥"错误
9. 关闭浏览器

验证错误提示是否正确显示。
```

---

### 命令 5: 调试模式

```
进入调试模式，详细测试每一步：

1. 启动浏览器并加载扩展
2. 执行诊断脚本：
   return {
     extensionLoaded: typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined',
     buttonExists: !!document.querySelector('.bilibili-summary-btn'),
     videoInfo: window.currentVideoInfo,
     manifest: chrome.runtime.getManifest()
   };
3. 配置 API
4. 导航到视频页面
5. 每隔 5 秒截图一次，观察变化
6. 获取所有控制台日志
7. 关闭浏览器

给我完整的调试报告。
```

---

## 📋 测试检查清单

测试完成后，确认以下项目：

### ✅ 成功标准

- [ ] 扩展成功加载
- [ ] "AI摘要"按钮在视频页面出现
- [ ] 点击按钮后模态框立即弹出
- [ ] 显示加载动画和"分析中"状态
- [ ] 内容逐块实时显示（流式效果）
- [ ] 内容持续增长（不是一次性出现）
- [ ] 最终状态变为"已完成"
- [ ] "复制结果"按钮变为可用
- [ ] 控制台无错误日志

### ❌ 失败标准

- [ ] 按钮未出现
- [ ] 点击后无响应
- [ ] 显示错误信息
- [ ] 内容为空
- [ ] 一直显示"分析中"不完成
- [ ] 控制台有错误

---

## 🎯 推荐测试流程

1. **先运行命令 2**（快速验证）：确认基础功能正常
2. **再运行命令 1**（完整测试）：测试流式分析
3. **如有问题**：运行命令 5（调试模式）

---

## 💡 使用技巧

### 中途停止测试
```
立即停止当前测试并关闭浏览器
```

### 只测试某一步
```
只测试配置功能：
1. 启动浏览器
2. 配置 API
3. 打开 options.html 截图验证
4. 关闭浏览器
```

### 自定义视频
```
测试另一个视频：https://www.bilibili.com/video/BV1GJ411x7h7
```

---

**准备就绪！重启 Claude Code 后，复制上面的任一命令即可开始测试。** 🚀
