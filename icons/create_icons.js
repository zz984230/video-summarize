const fs = require('fs');
const path = require('path');

// 创建简单的PNG图标数据（Base64编码的1x1像素透明PNG）
const createPlaceholderPNG = (width, height, color = '#FB7299') => {
  // 这里我们创建简单的彩色方块作为图标
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" rx="${Math.min(width, height) / 8}" fill="${color}"/>
    <text x="50%" y="65%" font-family="Arial, sans-serif" font-size="${Math.min(width, height) * 0.6}" font-weight="bold" text-anchor="middle" fill="white">B</text>
  </svg>`;
  
  return Buffer.from(svg).toString('base64');
};

// 创建图标文件
const iconSizes = [
  { size: 16, filename: 'icon16.png' },
  { size: 32, filename: 'icon32.png' },
  { size: 48, filename: 'icon48.png' },
  { size: 128, filename: 'icon128.png' }
];

console.log('正在创建图标文件...');

iconSizes.forEach(({ size, filename }) => {
  const iconPath = path.join(__dirname, filename);
  
  // 创建SVG内容
  const svgContent = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" rx="${size / 8}" fill="#FB7299"/>
    <text x="50%" y="65%" font-family="Arial, sans-serif" font-size="${size * 0.6}" font-weight="bold" text-anchor="middle" fill="white">B</text>
  </svg>`;
  
  // 由于我们不能直接生成PNG，我们先创建SVG文件
  // 用户可以用浏览器打开这些SVG并截图保存为PNG
  const svgPath = path.join(__dirname, filename.replace('.png', '.svg'));
  fs.writeFileSync(svgPath, svgContent);
  
  console.log(`创建了 ${svgPath}，请用浏览器打开并截图保存为 ${size}x${size} 像素的PNG文件`);
  console.log(`然后将截图保存为: ${iconPath}`);
});

console.log('\n图标SVG文件创建完成！');
console.log('请按以下步骤操作：');
console.log('1. 用浏览器打开每个SVG文件');
console.log('2. 调整浏览器缩放使图标显示为正确尺寸');
console.log('3. 截图并保存为对应尺寸的PNG文件');
console.log('4. 将PNG文件重命名为对应的icon*.png文件名');