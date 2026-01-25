# 🧪 手动测试指南

## ✅ 扩展文件验证结果

所有必需文件已存在：
- ✅ dist/background.js (18KB)
- ✅ dist/content.js (37KB)
- ✅ dist/options.html (10KB)
- ✅ dist/styles/content.css (5KB)
- ✅ manifest.json 配置正确

## 📋 手动测试步骤

### 步骤 1: 加载扩展

1. **打开 Chrome 浏览器**
2. **访问扩展管理页面**：在地址栏输入 `chrome://extensions/`
3. **开启开发者模式**：打开右上角的"开发者模式"开关
4. **加载扩展**：
   - 点击左上角的"加载已解压的扩展程序"
   - 选择目录：`D:\code\video-summarize\dist`
   - 确认加载

### 步骤 2: 配置 API

1. **打开扩展选项**：
   - 方法1：点击 Chrome 工具栏中的扩展图标 → 选项
   - 方法2：在 `chrome://extensions/` 页面点击"详细信息" →"扩展程序选项"

2. **填写配置**：
   ```
   API 密钥: 519c90dbdfc44c2cb839c6b52195fd3a.hJBSKOskvOz4hSJG
   API 地址: https://open.bigmodel.cn/api/paas/v4
   模型 ID: glm-4.6v-flash
   ```

3. **保存设置**

### 步骤 3: 测试基础功能

1. **访问测试视频**：
   ```
   https://www.bilibili.com/video/BV1NwrTB8EGQ
   ```

2. **等待按钮出现**（约 2-3 秒）
   - 页面右侧应该会出现 **"AI摘要"** 浮动按钮
   - 如果按钮未出现，按 F12 查看控制台是否有错误

### 步骤 4: 测试流式分析

1. **点击"AI摘要"按钮**

2. **观察模态框**：
   - ✅ 立即弹出模态框
   - ✅ 标题显示"🎬 视频分析中..."
   - ✅ 显示旋转的加载动画
   - ✅ 状态显示"生成中"

3. **观察流式内容**（约 5-10 秒后开始）：
   - ✅ 内容逐块实时显示
   - ✅ 无打字机效果，直接显示
   - ✅ 内容持续增长

4. **等待完成**（约 30-60 秒）：
   - ✅ 状态变为"已完成"
   - ✅ 标题变为"🎬 视频分析结果"
   - ✅ "复制结果"按钮变为可用

## 🔍 调试方法

### 查看控制台日志

**Content Script 日志**（视频页面）：
1. 在视频页面按 **F12** 打开开发者工具
2. 切换到 **Console** 标签
3. 查找以 `🎬 [Content]` 开头的日志

**Background 日志**：
1. 访问 `chrome://extensions/`
2. 找到"B站视频摘要助手"扩展
3. 点击 **"Service Worker"** 蓝色链接
4. 在打开的开发者工具中查看 Console

### 预期日志输出

**Content Script**:
```
🎬 [Content] Video page detected: BV1NwrTB8EGQ
🎬 [Content] Video info extracted: {...}
🎬 [Content] Start stream analysis
🎬 [Content] Modal created
🎬 [Content] Stream chunk received
🎬 [Content] Stream completed
```

**Background**:
```
🎬 [Background] Stream analysis request received
🎬 [Background] Starting stream analysis: BV1NwrTB8EGQ
🎬 [Background] Video URL fetched
🎬 [Background] API request sent
🎬 [Background] Stream chunk received
🎬 [Background] Stream completed
```

## ⚠️ 常见问题

### 问题 1: 按钮未出现

**可能原因**：
- Content script 未注入
- 页面未完全加载

**解决方法**：
- 刷新页面
- 检查控制台是否有错误
- 确认扩展已成功加载

### 问题 2: 点击后无响应

**可能原因**：
- API 未配置
- Background service 未运行

**解决方法**：
- 检查 API 密钥是否已保存
- 查看 Background Service Worker 日志
- 刷新扩展（在 chrome://extensions/ 点击刷新按钮）

### 问题 3: 显示错误信息

**可能原因**：
- API 密钥无效
- 网络连接问题
- API 配额用尽

**解决方法**：
- 验证 API 密钥是否正确
- 检查网络连接
- 查看具体错误信息

## ✅ 测试检查清单

- [ ] 扩展成功加载
- [ ] API 配置保存成功
- [ ] "AI摘要"按钮出现在视频页面
- [ ] 点击后立即弹出模态框
- [ ] 显示加载动画
- [ ] 内容逐块实时显示
- [ ] 分析完成后状态变为"已完成"
- [ ] "复制结果"按钮可用
- [ ] 控制台无错误日志

## 📸 测试截图

测试过程中建议截图保存：
1. 扩展加载成功的界面
2. "AI摘要"按钮出现
3. 模态框弹出（加载状态）
4. 流式内容正在显示
5. 分析完成后的状态

## 🎯 测试完成

如果所有步骤都成功，说明流式视频分析功能正常工作！

如有问题，请提供：
1. 具体的错误步骤
2. 控制台日志截图
3. 浏览器版本信息
