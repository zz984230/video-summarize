# 流式视频分析功能测试指南

## 📦 步骤 1: 加载扩展到 Chrome

### 方法一：手动加载
1. 打开 Chrome 浏览器
2. 在地址栏输入：`chrome://extensions/`
3. 打开右上角的 **"开发者模式"** 开关
4. 点击左上角的 **"加载已解压的扩展程序"**
5. 选择项目的 `dist` 目录：`D:\code\video-summarize\dist`
6. 确认扩展加载成功

### 方法二：使用命令行打开
```powershell
# 在 PowerShell 中运行
Start-Process "chrome://extensions/"
```

---

## 🔑 步骤 2: 配置智谱 API 密钥

### 获取 API 密钥
1. 访问智谱 AI 开放平台：https://open.bigmodel.cn/
2. 注册/登录账号
3. 进入 API 密钥管理页面
4. 创建新的 API 密钥

### 配置到扩展
1. 点击 Chrome 工具栏中的扩展图标
2. 选择 **"选项"** 或 **"Options"**
3. 填写配置：
   - **API 密钥**: 您的智谱 API Key（必需）
   - **API 地址**: `https://open.bigmodel.cn/api/paas/v4`（默认）
   - **模型 ID**: `glm-4.6v-flash`（默认）
   - **最大 Token**: 1000（默认）
   - **Temperature**: 0.7（默认）
4. 点击 **"保存设置"**

---

## 🧪 步骤 3: 测试基础功能

### 测试用例 1: 基础流式分析

**步骤**:
1. 访问一个 B站视频页面，例如：
   - https://www.bilibili.com/video/BV1GJ411x7h7
   - 或任意 B站视频

2. 等待页面加载完成（2-3秒）

3. 查看页面右侧是否出现 **"AI摘要"** 浮动按钮

4. 点击 **"AI摘要"** 按钮

**预期结果**:
- ✅ 立即弹出模态框
- ✅ 显示 "🎬 视频分析中..." 标题
- ✅ 显示旋转的加载动画
- ✅ 状态显示 "生成中"
- ✅ 几秒后开始逐段显示 AI 分析内容
- ✅ 内容实时追加显示（流式效果）
- ✅ 分析完成后状态变为 "已完成"
- ✅ 标题变为 "🎬 视频分析结果"
- ✅ "复制结果" 按钮变为可用

---

### 测试用例 2: 复制功能

**步骤**:
1. 等待视频分析完成
2. 点击模态框底部的 **"复制结果"** 按钮

**预期结果**:
- ✅ 按钮文字变为 **"已复制！"**
- ✅ 2秒后恢复为 **"复制结果"**
- ✅ 内容已复制到剪贴板（可粘贴到记事本验证）

---

### 测试用例 3: 关闭模态框

**步骤**:
1. 点击模态框右上角的 **×** 关闭按钮
   - 或点击模态框外部的遮罩层

**预期结果**:
- ✅ 模态框平滑关闭
- ✅ 按钮恢复为 "AI摘要" 状态

---

### 测试用例 4: 错误处理（可选测试）

**测试无 API 密钥**:
1. 清空 API 密钥配置
2. 保存设置
3. 点击 "AI摘要" 按钮

**预期结果**:
- ✅ 显示错误提示："请先在设置页面配置API密钥"

**测试无效 API 密钥**:
1. 输入错误的 API 密钥
2. 保存设置
3. 点击 "AI摘要" 按钮

**预期结果**:
- ✅ 几秒后显示错误信息（如 "API请求失败: 401..."）

---

## 🔍 步骤 4: 查看调试日志

### Content Script 日志（视频页面）
1. 在视频页面按 **F12** 打开开发者工具
2. 切换到 **Console** 标签
3. 点击 "AI摘要" 按钮
4. 观察日志输出

**预期日志**:
```
🎬 [Content] Video page detected: BVxxx
🎬 [Content] Video info extracted: {...}
🎬 [Content] Start stream analysis
🎬 [Content] Modal created
🎬 [Content] Stream chunk received: [部分内容]
...
🎬 [Content] Stream completed
🎬 [Content] Saved to history
```

### Background Service Worker 日志
1. 访问 `chrome://extensions/`
2. 找到 "Bilibili Video Summarizer" 扩展
3. 点击 **"Service Worker"** 蓝色链接
4. 在打开的开发者工具中查看 Console

**预期日志**:
```
🎬 [Background] Stream analysis request received: BVxxx
🎬 [Background] Starting stream analysis: BVxxx
🎬 [Background] Video URL fetched
🎬 [Background] API request sent
🎬 [Background] Stream chunk: [部分内容]
...
🎬 [Background] Stream completed
```

---

## ✅ 步骤 5: 验证功能清单

请勾选已测试通过的项目：

- [ ] 扩展成功加载到 Chrome
- [ ] API 密钥配置成功
- [ ] 访问视频页面后出现 "AI摘要" 按钮
- [ ] 点击按钮后立即弹出模态框
- [ ] 显示加载动画和 "分析中" 状态
- [ ] AI 分析内容逐块实时显示（流式效果）
- [ ] 分析完成后状态变为 "已完成"
- [ ] "复制结果" 按钮正常工作
- [ ] 关闭模态框功能正常
- [ ] 重复点击按钮时正确处理（禁用状态）
- [ ] 控制台无错误日志
- [ ] 长视频内容流畅显示

---

## 🐛 常见问题排查

### 问题 1: 扩展加载失败
**原因**: dist 目录可能不存在或构建失败
**解决**:
```bash
cd D:\code\video-summarize
npm run build
```

### 问题 2: "AI摘要" 按钮未出现
**原因**: Content script 未注入或页面不匹配
**解决**:
- 确认 URL 包含 `/video/` 和 `BV`
- 刷新页面
- 检查控制台是否有错误

### 问题 3: 无内容显示
**原因**: API 配置问题
**解决**:
- 检查 API 密钥是否正确
- 检查智谱 API 配额是否用尽
- 查看 Background 控制台的错误日志

### 问题 4: 内容显示异常
**原因**: 网络或解析问题
**解决**:
- 检查网络连接
- 查看控制台错误日志
- 刷新页面重试

---

## 📸 测试截图建议

建议截图保存以下场景：
1. 扩展加载成功界面
2. 选项配置页面
3. "AI摘要" 按钮显示在视频页面
4. 流式内容正在显示的模态框
5. 分析完成后的模态框
6. 控制台日志输出

---

## 📝 测试反馈

测试完成后，请记录：
- **测试日期**: ___________
- **Chrome 版本**: ___________
- **测试结果**: ✅ 通过 / ❌ 不通过
- **发现的问题**: ___________
- **建议和改进**: ___________

---

## 🎯 下一步

测试通过后：
1. 将测试结果反馈给开发团队
2. 如有问题，创建 issue 并附上截图和日志
3. 功能稳定后可考虑发布到 Chrome Web Store

---

**祝测试顺利！** 🚀
