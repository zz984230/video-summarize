// 使用在线图片生成API创建图标
const sizes = [16, 32, 48, 128];
const apiUrl = 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image';

sizes.forEach(size => {
  const prompt = encodeURIComponent(`Bilibili video summarizer app icon, pink color (#FB7299), white letter "B", clean modern design, square shape, simple minimalist style, high contrast, professional look`);
  const imageUrl = `${apiUrl}?prompt=${prompt}&image_size=square`;
  
  console.log(`${size}x${size} 图标生成链接:`);
  console.log(imageUrl);
  console.log('');
});

console.log('请访问上述链接下载图标，然后重命名为:');
console.log('- icon16.png (16x16)');
console.log('- icon32.png (32x32)');
console.log('- icon48.png (48x48)');
console.log('- icon128.png (128x128)');