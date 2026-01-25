// 简单的扩展验证脚本
const fs = require('fs');
const path = require('path');

console.log('🔍 验证扩展文件...\n');

// 检查 manifest
console.log('1. 检查 manifest.json:');
const manifestPath = 'dist/manifest.json';
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  console.log('  ✅ manifest.json 存在');
  console.log(`  名称: ${manifest.name}`);
  console.log(`  版本: ${manifest.version}`);
  console.log(`  Content Scripts: ${manifest.content_scripts?.length || 0}`);
  if (manifest.content_scripts) {
    manifest.content_scripts.forEach(cs => {
      console.log(`    - 匹配: ${cs.matches}`);
      console.log(`    - JS: ${cs.js}`);
    });
  }
} else {
  console.log('  ❌ manifest.json 不存在');
}

// 检查必需文件
console.log('\n2. 检查必需文件:');
const requiredFiles = [
  'dist/background.js',
  'dist/content.js',
  'dist/options.html',
  'dist/options.js',
  'dist/popup.html',
  'dist/popup.js',
  'dist/styles/content.css'
];

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const size = fs.statSync(file).size;
    console.log(`  ✅ ${file} (${Math.round(size/1024)}KB)`);
  } else {
    console.log(`  ❌ ${file} 缺失`);
  }
});

// 检查 content.js 中的关键代码
console.log('\n3. 检查 content.js 代码:');
const contentJS = fs.readFileSync('dist/content.js', 'utf8');
const checks = [
  { name: 'BilibiliVideoSummaryContent', pattern: /class\s+BilibiliVideoSummaryContent/ },
  { name: 'createStreamModal', pattern: /createStreamModal\s*\(/ },
  { name: 'appendStreamContent', pattern: /appendStreamContent\s*\(/ },
  { name: 'onStreamComplete', pattern: /onStreamComplete\s*\(/ },
  { name: 'AI摘要按钮', pattern: /bilibili-summary-btn/ },
  { name: 'STREAM_CHUNK', pattern: /STREAM_CHUNK/ }
];

checks.forEach(check => {
  if (check.pattern.test(contentJS)) {
    console.log(`  ✅ ${check.name} 存在`);
  } else {
    console.log(`  ❌ ${check.name} 缺失`);
  }
});

// 检查 background.js 中的关键代码
console.log('\n4. 检查 background.js 代码:');
const backgroundJS = fs.readFileSync('dist/background.js', 'utf8');
const bgChecks = [
  { name: 'BackgroundService', pattern: /class\s+BackgroundService/ },
  { name: 'handleStreamAnalysis', pattern: /handleStreamAnalysis/ },
  { name: 'parseSSEStream', pattern: /parseSSEStream/ },
  { name: 'START_STREAM_ANALYSIS', pattern: /START_STREAM_ANALYSIS/ },
  { name: 'reasoning_content', pattern: /reasoning_content/ }
];

bgChecks.forEach(check => {
  if (check.pattern.test(backgroundJS)) {
    console.log(`  ✅ ${check.name} 存在`);
  } else {
    console.log(`  ❌ ${check.name} 缺失`);
  }
});

console.log('\n5. 扩展路径:');
const distPath = path.resolve('dist');
console.log(`  绝对路径: ${distPath}`);
console.log(`  存在: ${fs.existsSync(distPath) ? '是' : '否'}`);

console.log('\n' + '='.repeat(50));
console.log('✅ 扩展文件验证完成！');
console.log('='.repeat(50));

console.log('\n📋 手动测试步骤:');
console.log('1. 打开 Chrome 浏览器');
console.log('2. 访问 chrome://extensions/');
console.log('3. 开启"开发者模式"');
console.log('4. 点击"加载已解压的扩展程序"');
console.log(`5. 选择目录: ${distPath}`);
console.log('6. 访问 https://www.bilibili.com/video/BV1NwrTB8EGQ');
console.log('7. 查看页面右侧是否出现"AI摘要"按钮');
console.log('8. 点击按钮测试流式分析功能');
