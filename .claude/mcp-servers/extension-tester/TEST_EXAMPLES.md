# MCP 测试示例

## 快速开始测试

在 Claude Code 中输入以下内容，即可自动测试扩展：

### 完整测试流程

```
请使用 extension-tester MCP 服务器帮我测试 Bilibili 视频总结扩展：

1. 启动浏览器
   - extensionPath: "D:\\code\\video-summarize\\dist"
   - headless: false

2. 配置扩展
   - apiKey: "519c90dbdfc44c2cb839c6b52195fd3a.hJBSKOskvOz4hSJG"
   - apiUrl: "https://open.bigmodel.cn/api/paas/v4"
   - modelId: "glm-4.6v-flash"

3. 访问测试视频
   - url: "https://www.bilibili.com/video/BV1NwrTB8EGQ"
   - waitForSelector: ".bilibili-summary-btn"

4. 等待按钮出现并截图

5. 点击"AI摘要"按钮

6. 等待模态框出现
   - waitForSelector: ".stream-modal"

7. 等待30秒让流式内容显示

8. 再次截图

9. 获取流式内容
   - selector: "#streamContent"

10. 检查完成状态
    - 检查 .status-badge 是否包含 "completed" 类

11. 获取控制台日志

12. 关闭浏览器

请给我详细的测试结果报告。
```

## 简化测试

### 只测试按钮是否出现

```
使用 extension-tester 测试扩展：

1. launch_browser: extensionPath = "D:\\code\\video-summarize\\dist"
2. navigate_to: url = "https://www.bilibili.com/video/BV1NwrTB8EGQ"
3. wait_for_element: selector = ".bilibili-summary-btn", timeout = 10000
4. take_screenshot
5. close_browser
```

### 测试流式分析功能

```
测试流式视频分析功能：

1. 启动浏览器：D:\\code\\video-summarize\\dist

2. 配置 API：519c90dbdfc44c2cb839c6b52195fd3a.hJBSKOskvOz4hSJG

3. 访问视频：https://www.bilibili.com/video/BV1NwrTB8EGQ

4. 点击 .bilibili-summary-btn 按钮

5. 等待 .stream-modal 出现

6. 等待 45 秒

7. 执行脚本检查状态：
   const statusBadge = document.querySelector('.status-badge');
   const title = document.querySelector('.modal-header h3');
   const content = document.querySelector('#streamContent');
   return {
     status: statusBadge?.textContent,
     title: title?.textContent,
     contentLength: content?.textContent?.length || 0,
     isCompleted: statusBadge?.classList.contains('completed')
   };

8. 截图

9. 关闭浏览器
```

### 调试问题

```
调试扩展问题：

1. 启动浏览器：D:\\code\\video-summarize\\dist

2. 配置 API：519c90dbdfc44c2cb839c6b52195fd3a.hJBSKOskvOz4hSJG

3. 访问视频：https://www.bilibili.com/video/BV1NwrTB8EGQ

4. 点击按钮

5. 每隔 10 秒截图一次，共 5 次

6. 获取控制台日志

7. 关闭浏览器
```

## 测试模板

### 标准测试流程

复制以下内容到 Claude Code：

```
请按以下步骤测试扩展：

**步骤1**: 使用 launch_browser 工具
- extensionPath: "D:\\code\\video-summarize\\dist"
- headless: false

**步骤2**: 使用 configure_extension 工具
- apiKey: "519c90dbdfc44c2cb839c6b52195fd3a.hJBSKOskvOz4hSJG"

**步骤3**: 使用 navigate_to 工具
- url: "https://www.bilibili.com/video/BV1NwrTB8EGQ"
- waitForSelector: ".bilibili-summary-btn"

**步骤4**: 使用 take_screenshot 工具

**步骤5**: 使用 click_element 工具
- selector: ".bilibili-summary-btn"

**步骤6**: 使用 wait_for_element 工具
- selector: ".stream-modal"
- timeout: 5000

**步骤7**: 等待 45 秒

**步骤8**: 使用 execute_script 工具
- script: |
  const statusBadge = document.querySelector('.status-badge');
  const copyBtn = document.querySelector('.copy-btn');
  const content = document.querySelector('#streamContent');
  return {
    statusText: statusBadge?.textContent,
    statusClasses: statusBadge?.className,
    copyBtnDisabled: copyBtn?.disabled,
    contentLength: content?.textContent?.length || 0,
    contentPreview: content?.textContent?.substring(0, 100)
  };

**步骤9**: 使用 take_screenshot 工具

**步骤10**: 使用 get_console_logs 工具

**步骤11**: 使用 close_browser 工具

请生成测试报告。
```

## 批量测试

### 测试多个视频

```
批量测试扩展：

测试视频列表：
1. https://www.bilibili.com/video/BV1NwrTB8EGQ
2. https://www.bilibili.com/video/BV1GJ411x7h7

对每个视频执行：
1. 启动浏览器并配置
2. 访问视频
3. 点击分析按钮
4. 等待 45 秒
5. 记录结果（状态、内容长度）
6. 截图
7. 关闭浏览器

生成汇总报告。
```

## 预期输出

### 成功的测试应该返回：

```
✅ 测试结果报告

**浏览器启动**: 成功
✅ 扩展加载成功

**API 配置**: 成功
✅ API 密钥已保存

**导航**: 成功
✅ 页面加载完成
✅ "AI摘要"按钮已出现

**按钮点击**: 成功
✅ 模态框已弹出

**流式显示**: 进行中...
✅ 内容正在实时显示
- 10秒: 约 100 字符
- 30秒: 约 500 字符
- 45秒: 分析完成

**最终状态**: 成功
✅ 状态: 已完成
✅ 标题: "🎬 视频分析结果"
✅ 复制按钮: 可用
✅ 内容长度: 523 字符

**控制台日志**: 无错误
✅ 所有功能正常

**截图**: [图片]
```

### 如果失败：

```
❌ 测试失败报告

**失败步骤**: 点击按钮
**错误信息**: 元素未找到: .bilibili-summary-btn
**可能原因**:
1. Content script 未注入
2. 页面未完全加载
3. CSS 选择器错误

**建议操作**:
1. 检查控制台日志
2. 增加等待时间
3. 刷新页面重试
```

## 高级用法

### 自定义等待逻辑

```
等待流式内容完成：

执行脚本：
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 60; // 最多等 60 秒

    const checkStatus = () => {
      const statusBadge = document.querySelector('.status-badge');
      if (statusBadge?.classList.contains('completed')) {
        resolve({
          status: 'completed',
          content: document.querySelector('#streamContent')?.textContent
        });
      } else if (attempts >= maxAttempts) {
        resolve({
          status: 'timeout',
          currentContent: document.querySelector('#streamContent')?.textContent?.substring(0, 100)
        });
      } else {
        attempts++;
        setTimeout(checkStatus, 1000);
      }
    };

    checkStatus();
  });
```

### 性能测试

```
性能测试：

1. 记录开始时间

2. 点击按钮

3. 每隔 5 秒记录内容长度，共 60 秒

4. 生成内容增长曲线

5. 记录完成时间

6. 计算平均速度（字符/秒）
```

## 故障排查脚本

### 检查扩展状态

```
诊断脚本：

execute_script:
  script: |
    // 检查所有关键元素
    const diagnostics = {
      buttonExists: !!document.querySelector('.bilibili-summary-btn'),
      modalExists: !!document.querySelector('.stream-modal'),
      statusBadge: document.querySelector('.status-badge')?.textContent,
      contentElement: !!document.querySelector('#streamContent'),
      chromeExtension: typeof chrome !== 'undefined',
      chromeRuntime: typeof chrome?.runtime !== 'undefined',
      videoInfo: window.currentVideoInfo ? 'present' : 'missing'
    };

    return JSON.stringify(diagnostics, null, 2);
```
