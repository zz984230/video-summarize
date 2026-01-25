# 🎯 在 Claude Code 中使用 MCP 自动测试扩展

## 🚀 快速开始

### 步骤 1: 一键安装

在项目根目录运行：

```powershell
# PowerShell
.\setup-mcp.bat
```

或手动执行：

```bash
cd .claude/mcp-servers/extension-tester
npm install
node setup.js
```

### 步骤 2: 重启 Claude Code

**重要**: 必须重启 Claude Code 才能加载新的 MCP 服务器！

### 步骤 3: 开始测试

在 Claude Code 中输入：

```
请使用 extension-tester MCP 服务器帮我测试 Bilibili 扩展：

1. 启动浏览器（扩展路径：D:\code\video-summarize\dist）
2. 配置 API 密钥：519c90dbdfc44c2cb839c6b52195fd3a.hJBSKOskvOz4hSJG
3. 访问视频：https://www.bilibili.com/video/BV1NwrTB8EGQ
4. 等待按钮出现
5. 点击"AI摘要"按钮
6. 等待 45 秒
7. 截图并获取内容
8. 关闭浏览器
```

---

## 📋 MCP 服务器功能

### 可用工具

| 工具 | 功能 | 参数 |
|------|------|------|
| `launch_browser` | 启动带扩展的浏览器 | `extensionPath`, `headless` |
| `navigate_to` | 导航到 URL | `url`, `waitForSelector` |
| `click_element` | 点击元素 | `selector`, `timeout` |
| `wait_for_element` | 等待元素出现 | `selector`, `timeout` |
| `get_text` | 获取元素文本 | `selector` |
| `get_content` | 获取页面内容 | `selector` (可选) |
| `take_screenshot` | 截图 | `path` (可选) |
| `execute_script` | 执行 JavaScript | `script` |
| `get_console_logs` | 获取控制台日志 | `clear` (可选) |
| `configure_extension` | 配置扩展 | `apiKey`, `apiUrl`, `modelId` |
| `close_browser` | 关闭浏览器 | 无 |

---

## 💡 测试示例

### 示例 1: 快速功能测试

```
使用 extension-tester 测试：

1. launch_browser: extensionPath = "D:\\code\\video-summarize\\dist"
2. configure_extension: apiKey = "519c90dbdfc44c2cb839c6b52195fd3a.hJBSKOskvOz4hSJG"
3. navigate_to: url = "https://www.bilibili.com/video/BV1NwrTB8EGQ", waitForSelector = ".bilibili-summary-btn"
4. take_screenshot
5. click_element: selector = ".bilibili-summary-btn"
6. wait_for_element: selector = ".stream-modal"
7. 等待 45 秒
8. take_screenshot
9. get_content: selector = "#streamContent"
10. close_browser
```

### 示例 2: 完整的流式分析测试

```
测试流式视频分析功能，步骤如下：

【启动浏览器】
- extensionPath: "D:\\code\\video-summarize\\dist"
- headless: false

【配置扩展】
- apiKey: "519c90dbdfc44c2cb839c6b52195fd3a.hJBSKOskvOz4hSJG"
- apiUrl: "https://open.bigmodel.cn/api/paas/v4"
- modelId: "glm-4.6v-flash"

【访问测试视频】
- url: "https://www.bilibili.com/video/BV1NwrTB8EGQ"
- waitForSelector: ".bilibili-summary-btn"

【初始检查】
截图确认按钮出现

【触发分析】
点击 .bilibili-summary-btn 按钮

【等待模态框】
wait_for_element: selector = ".stream-modal", timeout = 10000

【流式内容验证】
每隔 15 秒执行以下脚本检查内容增长：
  const content = document.querySelector('#streamContent');
  return {
    length: content?.textContent?.length || 0,
    preview: content?.textContent?.substring(0, 50)
  };
共执行 3 次（45秒）

【最终状态检查】
execute_script:
  const statusBadge = document.querySelector('.status-badge');
  const title = document.querySelector('.modal-header h3');
  const copyBtn = document.querySelector('.copy-btn');
  return {
    status: statusBadge?.textContent,
    isCompleted: statusBadge?.classList.contains('completed'),
    title: title?.textContent,
    copyEnabled: !copyBtn?.disabled,
    contentLength: document.querySelector('#streamContent')?.textContent?.length
  };

【获取日志】
get_console_logs: clear = true

【最终截图】

【关闭浏览器】

请生成完整的测试报告。
```

### 示例 3: 调试问题

```
帮我调试扩展问题：

1. 启动浏览器：D:\\code\\video-summarize\\dist
2. 配置 API：519c90dbdfc44c2cb839c6b52195fd3a.hJBSKOskvOz4hSJG
3. 访问：https://www.bilibili.com/video/BV1NwrTB8EGQ
4. 等待按钮出现
5. 诊断脚本：
   return {
     buttonExists: !!document.querySelector('.bilibili-summary-btn'),
     chrome: typeof chrome !== 'undefined',
     runtime: typeof chrome?.runtime !== 'undefined',
     currentVideoInfo: !!window.currentVideoInfo
   };
6. 点击按钮
7. 每隔 10 秒截图，共 5 次
8. 获取所有控制台日志
9. 关闭浏览器
```

---

## 🎨 高级用法

### 自定义等待流式完成

```
等待流式内容完全加载后再截图：

execute_script:
  script: |
    return new Promise((resolve) => {
      const maxWait = 60000; // 最多等 60 秒
      const startTime = Date.now();

      const check = () => {
        const statusBadge = document.querySelector('.status-badge');
        if (statusBadge?.classList.contains('completed')) {
          resolve({
            success: true,
            duration: Date.now() - startTime,
            content: document.querySelector('#streamContent')?.textContent
          });
        } else if (Date.now() - startTime > maxWait) {
          resolve({
            success: false,
            timeout: true,
            currentContent: document.querySelector('#streamContent')?.textContent?.substring(0, 100)
          });
        } else {
          setTimeout(check, 1000);
        }
      };
      check();
    });
```

### 性能测试

```
性能测试 - 记录内容增长速度：

1. 启动并配置扩展
2. 访问视频并点击按钮
3. 记录初始时间
4. 每 5 秒记录一次内容长度，持续 60 秒
5. 生成时间-内容长度曲线
6. 计算平均速度
```

### 批量测试

```
批量测试多个视频：

视频列表：
1. https://www.bilibili.com/video/BV1NwrTB8EGQ
2. https://www.bilibili.com/video/BV1GJ411x7h7

对每个视频执行完整测试并记录：
- 按钮出现时间
- 分析完成时间
- 内容长度
- 是否成功
```

---

## 📊 预期输出

### 成功的测试结果

```
✅ MCP 测试报告

【浏览器】
✅ 已启动
✅ 扩展已加载：D:\code\video-summarize\dist

【配置】
✅ API 密钥已保存

【导航】
✅ 页面加载完成
✅ "AI摘要"按钮已出现（耗时：2.3秒）

【分析】
✅ 按钮点击成功
✅ 模态框已弹出

【流式内容】
⏱️  0秒: 0 字符
⏱️ 15秒: 156 字符
⏱️ 30秒: 342 字符
⏱️ 45秒: 528 字符
✅ 分析完成

【最终状态】
✅ 状态: 已完成
✅ 标题: "🎬 视频分析结果"
✅ 复制按钮: 已启用
✅ 内容长度: 528 字符

【日志】
✅ 无错误

【截图】
[图片 1: 初始状态]
[图片 2: 分析完成]
```

---

## ⚠️ 常见问题

### Q: MCP 服务器未加载
**A**:
1. 确认已运行 `setup-mcp.bat`
2. **重启 Claude Code**（重要！）
3. 检查配置文件 `%APPDATA%\Claude\claude_desktop_config.json`

### Q: 扩展未加载
**A**:
1. 确认路径使用双反斜杠：`D:\\\\code\\\\video-summarize\\\\dist`
2. 确认 dist 目录存在
3. 运行 `npm run build` 重新构建

### Q: 元素未找到
**A**:
1. 增加等待时间
2. 检查 CSS 选择器是否正确
3. 先截图查看页面状态

### Q: 脚本执行错误
**A**:
1. 使用 execute_script 时确保脚本返回值
2. 检查 JavaScript 语法
3. 使用 try-catch 包裹脚本

---

## 📚 相关文档

- `README.md` - MCP 服务器详细文档
- `TEST_EXAMPLES.md` - 更多测试示例
- `QUICK_TEST_GUIDE.md` - 手动测试指南

---

## 🎉 开始测试

现在您可以在 Claude Code 中使用自然语言测试扩展了！

简单示例：
```
使用 extension-tester 测试我的扩展，看看流式分析功能是否正常。
```

Claude Code 会自动：
1. 启动浏览器
2. 加载扩展
3. 配置 API
4. 访问视频
5. 点击按钮
6. 记录结果

就这么简单！🚀
