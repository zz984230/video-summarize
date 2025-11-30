# B站视频摘要助手 - 连接问题修复指南

## 🚨 问题描述

当点击"保存配置"时出现错误：
```
保存配置失败: Error: Could not establish connection. Receiving end does not exist.
```

## 🔍 问题原因分析

这个错误通常表示插件的内容脚本无法与后台服务建立连接，可能的原因包括：

1. **后台脚本未正确加载**
2. **内容脚本未正确注入**
3. **manifest.json 配置错误**
4. **插件权限问题**
5. **浏览器缓存问题**

## 🛠️ 修复步骤

### 步骤1: 使用诊断工具

我们为您创建了三个诊断工具，请按顺序使用：

#### 1.1 快速诊断 (`simple_test.js`)
在浏览器控制台中运行：
```javascript
// 复制 simple_test.js 的内容到控制台运行
quickDiagnose();
```

#### 1.2 连接修复 (`fix_connection.js`)
如果快速诊断发现问题，运行：
```javascript
// 复制 fix_connection.js 的内容到控制台运行
fixPluginConnection();
```

#### 1.3 完整测试页面
打开 `test_plugin.html` 文件进行完整测试。

### 步骤2: 检查 manifest.json

确保 `manifest.json` 包含以下配置：

```json
{
  "manifest_version": 3,
  "permissions": [
    "activeTab",
    "storage"
  ],
  "host_permissions": [
    "https://*.bilibili.com/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["https://*.bilibili.com/*"],
      "js": ["content.js"],
      "run_at": "document_end"
    }
  ]
}
```

### 步骤3: 检查后台脚本

1. 打开 `chrome://extensions/`
2. 找到"B站视频摘要助手"
3. 点击"背景页"链接
4. 查看控制台是否有错误

后台脚本应该监听以下消息：
- `saveConfig` - 保存配置
- `getConfig` - 获取配置
- `saveResult` - 保存结果
- `getCache` - 获取缓存

### 步骤4: 检查内容脚本

在 B 站页面打开控制台，检查：
1. 内容脚本是否已加载
2. 是否有错误信息
3. 是否能接收 `getVideoInfo` 消息

### 步骤5: 重新构建和加载

```bash
# 重新构建项目
npm run build

# 重新加载插件
# 1. 打开 chrome://extensions/
# 2. 点击刷新按钮
# 3. 重新加载 B 站页面
```

## 📋 常见错误及解决方案

### 错误1: "Could not establish connection"
**原因**: 后台脚本未加载
**解决**: 
1. 重新加载插件
2. 检查 `background.service_worker` 配置
3. 查看后台页面控制台

### 错误2: "Receiving end does not exist"
**原因**: 内容脚本未注入
**解决**:
1. 确保在 B 站页面运行
2. 检查 `content_scripts.matches` 配置
3. 刷新页面

### 错误3: "Cannot read property 'local' of undefined"
**原因**: 存储权限未声明
**解决**: 检查 `permissions` 是否包含 `storage`

## 🎯 验证修复结果

修复后，请验证以下功能：

1. ✅ 能够保存配置
2. ✅ 能够获取配置
3. ✅ 内容脚本能响应消息
4. ✅ 后台脚本无错误日志

## 🚀 一键修复脚本

复制以下代码到浏览器控制台运行：

```javascript
// 一键诊断和修复
(function() {
    console.log('🚀 开始一键修复...');
    
    // 检查基础环境
    if (typeof chrome === 'undefined' || !chrome.runtime) {
        console.error('❌ 基础环境错误');
        return;
    }
    
    // 测试后台连接
    chrome.runtime.sendMessage({ action: 'getConfig' }, (response) => {
        if (chrome.runtime.lastError) {
            console.log('❌ 连接失败，尝试重新加载插件...');
            
            // 手动重新加载步骤
            console.log('📋 请手动执行以下步骤：');
            console.log('1. 打开 chrome://extensions/');
            console.log('2. 找到 "B站视频摘要助手"');
            console.log('3. 点击刷新按钮');
            console.log('4. 重新加载此页面');
            console.log('5. 重新运行此脚本');
            
        } else {
            console.log('✅ 连接正常，测试配置保存...');
            
            // 测试配置保存
            chrome.runtime.sendMessage({ 
                action: 'saveConfig', 
                config: { test: true, timestamp: Date.now() }
            }, (saveResponse) => {
                if (chrome.runtime.lastError) {
                    console.error('❌ 配置保存失败:', chrome.runtime.lastError.message);
                } else {
                    console.log('✅ 修复成功！插件工作正常');
                    console.log('🎉 现在可以尝试保存您的模型配置了');
                }
            });
        }
    });
})();
```

## 📞 进一步帮助

如果以上步骤仍无法解决问题，请提供以下信息：

1. 浏览器版本
2. 插件版本
3. 控制台错误日志
4. 诊断工具输出结果
5. manifest.json 内容

我们将根据这些信息提供进一步的技术支持。