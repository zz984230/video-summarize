const axios = require('axios');

// 测试ModelScope API配置
const config = {
  baseURL: 'https://api-inference.modelscope.cn/v1/',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ms-871280c4-7729-4d3c-bc74-9fbd22dd9660'
  }
};

// 测试连接
async function testConnection() {
  console.log('测试ModelScope API连接...');
  
  // 1. 首先测试基本的聊天完成端点
  try {
    const response = await axios.post(
      'https://api-inference.modelscope.cn/v1/chat/completions',
      {
        model: 'Qwen/Qwen3-VL-30B-A3B-Instruct',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 1
      },
      config
    );
    console.log('✓ 基本连接成功:', response.status);
  } catch (error) {
    console.error('✗ 基本连接失败:', error.response?.status, error.response?.data);
  }
  
  // 2. 测试多模态格式
  try {
    const response = await axios.post(
      'https://api-inference.modelscope.cn/v1/chat/completions',
      {
        model: 'Qwen/Qwen3-VL-30B-A3B-Instruct',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'video',
                video: 'https://www.bilibili.com/video/BV1yUyuB2EfM/'
              },
              {
                type: 'text',
                text: '这个视频的主要内容是什么？'
              }
            ]
          }
        ],
        max_tokens: 2000
      },
      config
    );
    console.log('✓ 多模态格式成功:', response.status);
    console.log('响应:', response.data);
  } catch (error) {
    console.error('✗ 多模态格式失败:', error.response?.status, error.response?.data);
    console.error('错误详情:', error.message);
  }
  
  // 3. 检查可用的模型列表
  try {
    const response = await axios.get('https://api-inference.modelscope.cn/v1/models', config);
    console.log('✓ 模型列表:', response.data);
  } catch (error) {
    console.error('✗ 无法获取模型列表:', error.response?.status);
  }
}

testConnection();