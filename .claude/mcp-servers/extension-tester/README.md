# Chrome Extension Testing MCP Server

这个 MCP 服务器允许在 Claude Code 中自动化测试 Chrome 扩展。

## 功能特性

- 🚀 启动带扩展的 Chrome 浏览器
- 🌐 导航到网页
- 🖱️ 模拟用户操作（点击、输入等）
- 📸 截图
- 📋 获取页面内容和文本
- 🔧 配置扩展选项
- 📊 获取控制台日志
- ⚡ 执行 JavaScript

## 安装

```bash
cd .claude/mcp-servers/extension-tester
npm install
```

## 配置

将以下内容添加到 Claude Code 的 MCP 配置中：

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "extension-tester": {
      "command": "node",
      "args": ["D:\\code\\video-summarize\\.claude\\mcp-servers\\extension-tester\\index.js"],
      "cwd": "D:\\code\\video-summarize"
    }
  }
}
```

## 使用示例

### 基础测试流程

```
# 1. 启动浏览器并加载扩展
使用 extension-tester 的 launch_browser 工具：
- extensionPath: "D:\\code\\video-summarize\\dist"

# 2. 配置扩展 API
使用 extension-tester 的 configure_extension 工具：
- apiKey: "your-api-key"

# 3. 访问测试视频
使用 extension-tester 的 navigate_to 工具：
- url: "https://www.bilibili.com/video/BV1NwrTB8EGQ"
- waitForSelector: ".bilibili-summary-btn"

# 4. 点击 AI 摘要按钮
使用 extension-tester 的 click_element 工具：
- selector: ".bilibili-summary-btn"

# 5. 等待模态框出现
使用 extension-tester 的 wait_for_element 工具：
- selector: ".stream-modal"

# 6. 截图查看结果
使用 extension-tester 的 take_screenshot 工具

# 7. 获取分析内容
使用 extension-tester 的 get_content 工具：
- selector: "#streamContent"

# 8. 查看控制台日志
使用 extension-tester 的 get_console_logs 工具

# 9. 关闭浏览器
使用 extension-tester 的 close_browser 工具
```

## 完整测试脚本示例

在 Claude Code 中输入：

```
请帮我测试 Bilibili 视频总结扩展的流式分析功能：

1. 启动浏览器加载扩展（路径：D:\code\video-summarize\dist）
2. 配置 API 密钥为：519c90dbdfc44c2cb839c6b52195fd3a.hJBSKOskvOz4hSJG
3. 访问视频：https://www.bilibili.com/video/BV1NwrTB8EGQ
4. 等待"AI摘要"按钮出现
5. 点击按钮
6. 截图并获取内容
7. 等待30秒后再次截图
8. 获取控制台日志
9. 关闭浏览器
```

## 可用工具

### launch_browser
启动带扩展的 Chrome 浏览器
- `extensionPath` (必需): 扩展目录路径
- `headless` (可选): 无头模式，默认 false

### navigate_to
导航到指定 URL
- `url` (必需): 目标 URL
- `waitForSelector` (可选): 等待的 CSS 选择器

### click_element
点击页面元素
- `selector` (必需): CSS 选择器
- `timeout` (可选): 超时时间，默认 5000ms

### wait_for_element
等待元素出现
- `selector` (必需): CSS 选择器
- `timeout` (可选): 超时时间，默认 10000ms

### get_text
获取元素文本
- `selector` (必需): CSS 选择器

### get_content
获取页面内容
- `selector` (可选): 特定元素的 CSS 选择器

### take_screenshot
截图
- `path` (可选): 保存路径

### execute_script
执行 JavaScript
- `script` (必需): JavaScript 代码

### get_console_logs
获取控制台日志
- `clear` (可选): 读取后清空，默认 false

### configure_extension
配置扩展选项
- `apiKey` (必需): API 密钥
- `apiUrl` (可选): API 地址
- `modelId` (可选): 模型 ID

### close_browser
关闭浏览器

## 注意事项

1. **扩展路径必须使用绝对路径**
2. **Windows 路径需要双反斜杠**：`D:\\\\code\\\\video-summarize\\\\dist`
3. **不能在无头模式下测试扩展**：headless 必须为 false
4. **测试完成后记得关闭浏览器**

## 故障排查

### 扩展未加载
- 检查路径是否正确
- 确认 dist 目录存在且已构建

### 元素未找到
- 增加等待时间
- 检查 CSS 选择器是否正确

### API 调用失败
- 检查控制台日志
- 确认 API 密钥有效

## 高级用法

### 自定义等待条件
```javascript
// 执行自定义脚本等待流式内容完成
execute_script:
  script: |
    return new Promise((resolve) => {
      const checkContent = () => {
        const statusBadge = document.querySelector('.status-badge');
        if (statusBadge && statusBadge.classList.contains('completed')) {
          resolve('Stream completed');
        } else {
          setTimeout(checkContent, 1000);
        }
      };
      checkContent();
    });
```

### 批量测试多个视频
```
创建测试循环：
1. 定义视频列表
2. 遍历每个视频
3. 执行完整测试流程
4. 记录结果
```

## 更新日志

- v1.0.0: 初始版本
  - 支持基本的浏览器操作
  - 支持扩展配置
  - 支持截图和日志获取
