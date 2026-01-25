// 测试智谱 API 响应格式
const API_KEY = '519c90dbdfc44c2cb839c6b52195fd3a.hJBSKOskvOz4hSJG';
const API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const MODEL_ID = 'glm-4.6v-flash';

async function testAPI() {
  console.log('🧪 测试智谱 API 响应格式...\n');

  const requestBody = {
    model: MODEL_ID,
    stream: true,
    messages: [{
      role: 'user',
      content: '你好'
    }],
    max_tokens: 50,
    temperature: 0.7
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log(`响应状态: ${response.status}\n`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 请求失败:', errorText);
      return;
    }

    // 读取原始响应
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    console.log('原始 SSE 数据:\n');
    console.log('='.repeat(60));

    let chunkCount = 0;
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        console.log('='.repeat(60));
        console.log('\n✅ 流结束');
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          chunkCount++;
          console.log(`[${chunkCount}] ${line}`);

          // 尝试解析
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data !== '[DONE]') {
              try {
                const parsed = JSON.parse(data);
                console.log(`   → 解析结果:`, JSON.stringify(parsed, null, 2));
              } catch (e) {
                console.log(`   → 解析失败: ${e.message}`);
              }
            }
          }
        }
      }
    }

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
  }
}

testAPI();
