# 🧪 快速测试指南

## 📋 测试前准备

### 1. API 密钥
您的 API 密钥已配置：
```
519c90dbdfc44c2cb839c6b52195fd3a.hJBSKOskvOz4hSJG
```

### 2. 测试视频
```
https://www.bilibili.com/video/BV1NwrTB8EGQ
```

---

## 🚀 快速开始

### 步骤 1: 加载扩展

1. **打开 Chrome 扩展页面**
   ```
   chrome://extensions/
   ```

2. **启用开发者模式**
   - 打开右上角的 "开发者模式" 开关

3. **加载扩展**
   - 点击 "加载已解压的扩展程序"
   - 选择目录：`D:\code\video-summarize\dist`

### 步骤 2: 配置 API

1. **打开扩展选项**
   - 方法1：点击扩展图标 → 选项
   - 方法2：chrome://extensions/ → 扩展详情 → 扩展程序选项

2. **填写配置**
   ```
   API 密钥: 519c90dbdfc44c2cb839c6b52195fd3a.hJBSKOskvOz4hSJG
   API 地址: https://open.bigmodel.cn/api/paas/v4
   模型 ID: glm-4.6v-flash
   ```

3. **保存设置**

### 步骤 3: 测试

1. **访问测试视频**
   ```
   https://www.bilibili.com/video/BV1NwrTB8EGQ
   ```

2. **等待按钮出现**（约2-3秒）
   - 页面右侧会出现 "AI摘要" 按钮

3. **点击 "AI摘要" 按钮**
   - 应该立即弹出模态框
   - 显示加载动画
   - 几秒后开始显示流式内容

---

## ✅ 预期结果

### 成功的标志
- [ ] 扩展加载成功（在 chrome://extensions/ 中可见）
- [ ] 配置保存成功（重新打开选项页面，配置还在）
- [ ] "AI摘要" 按钮出现在视频页面
- [ ] 点击后立即弹出模态框
- [ ] 模态框标题：🎬 视频分析中...
- [ ] 显示旋转的加载动画
- [ ] 状态显示 "生成中"
- [ ] **几秒后开始逐段显示 AI 分析内容**（流式效果）
- [ ] 内容实时追加显示
- [ ] 分析完成后变为 "已完成"
- [ ] 标题变为 "🎬 视频分析结果"
- [ ] "复制结果" 按钮可用

### 可能的问题

#### 问题 1: 按钮未出现
**解决**:
- 刷新页面
- 确认 URL 包含 `/video/` 和 `BV`
- 按 F12 查看控制台错误

#### 问题 2: 点击后无响应
**解决**:
- 按 F12 打开控制台
- 查看是否有错误日志
- 检查 API 密钥是否正确

#### 问题 3: 显示错误提示
**解决**:
- 查看 Background Service Worker 日志：
  1. chrome://extensions/
  2. 找到扩展，点击 "Service Worker"
  3. 查看控制台输出

---

## 📊 API 测试结果

您的 API 密钥已通过验证：

```
✅ 连接成功
✅ 流式响应正常
✅ 数据格式正确
```

---

## 🔍 调试日志

### Content Script 日志（视频页面）
按 F12 → Console，应该看到：

```
🎬 [Content] Video page detected: BV1NwrTB8EGQ
🎬 [Content] Video info extracted: {...}
🎬 [Content] Start stream analysis
🎬 [Content] Modal created
🎬 [Content] Stream chunk received: [部分内容]
...
🎬 [Content] Stream completed
🎬 [Content] Saved to history
```

### Background 日志
1. chrome://extensions/
2. 点击 "Service Worker"
3. Console 中应该看到：

```
🎬 [Background] Stream analysis request received
🎬 [Background] Starting stream analysis: BV1NwrTB8EGQ
🎬 [Background] Video URL fetched
🎬 [Background] API request sent
🎬 [Background] Stream chunk: [部分内容]
...
🎬 [Background] Stream completed
```

---

## 🎬 视频分析预期内容

对于这个测试视频，AI 应该会分析：
- 视频主题和内容
- 主要观点
- 关键信息
- 总结和评价

内容会**逐字逐句**实时显示，而不是一次性全部出现。

---

## 📸 测试反馈

测试完成后，请反馈：

**成功** ✅
- 功能正常工作
- 流式显示效果流畅

**问题** ❌
- 具体的错误信息
- 控制台日志
- 浏览器版本

---

**祝测试顺利！** 🚀
