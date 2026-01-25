const fs = require('fs');
const path = require('path');
const os = require('os');

// 配置内容
const config = {
  mcpServers: {
    "extension-tester": {
      command: "node",
      args: [
        path.resolve("D:\\code\\video-summarize\\.claude\\mcp-servers\\extension-tester\\index.js")
      ],
      cwd: "D:\\code\\video-summarize"
    }
  }
};

// 配置文件路径
const configDir = path.join(os.homedir(), 'AppData', 'Roaming', 'Claude');
const configPath = path.join(configDir, 'claude_desktop_config.json');

console.log('🔧 Extension Tester MCP Server 配置工具\n');
console.log(`配置目录: ${configDir}`);
console.log(`配置文件: ${configPath}\n`);

// 确保配置目录存在
if (!fs.existsSync(configDir)) {
  console.log('创建配置目录...');
  fs.mkdirSync(configDir, { recursive: true });
}

// 读取现有配置
let existingConfig = {};
if (fs.existsSync(configPath)) {
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    existingConfig = JSON.parse(content);
    console.log('✅ 读取到现有配置\n');
  } catch (error) {
    console.log('⚠️  配置文件损坏，将创建新配置\n');
  }
}

// 合并配置
const mergedConfig = {
  ...existingConfig,
  mcpServers: {
    ...existingConfig.mcpServers,
    ...config.mcpServers
  }
};

// 写入配置
fs.writeFileSync(configPath, JSON.stringify(mergedConfig, null, 2), 'utf8');

console.log('✅ 配置已保存！\n');
console.log('配置内容:');
console.log(JSON.stringify(config, null, 2));
console.log('\n📝 下一步:');
console.log('1. ⚠️  必须重启 Claude Code');
console.log('2. 在 Claude Code 中输入: "使用 extension-tester 帮我测试扩展"');
console.log('3. 参考 MCP_TESTING_GUIDE.md 中的测试示例\n');
console.log('🎉 配置完成！');
