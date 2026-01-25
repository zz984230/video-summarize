// 测试智谱 GLM-4.6V-Flash API 流式调用
// 这个脚本用于验证 API Key 和流式功能

const API_KEY = '519c90dbdfc44c2cb839c6b52195fd3a.hJBSKOskvOz4hSJG';
const API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const MODEL_ID = 'glm-4.6v-flash';

async function testStreamingAPI() {
  console.log('🧪 开始测试智谱 GLM-4.6V-Flash API...\n');

  const requestBody = {
    model: MODEL_ID,
    stream: true,
    messages: [{
      role: 'user',
      content: '请用一句话介绍你自己'
    }],
    max_tokens: 100,
    temperature: 0.7
  };

  console.log('📤 发送请求到:', API_URL);
  console.log('📦 请求体:', JSON.stringify(requestBody, null, 2));
  console.log('\n⏳ 等待流式响应...\n');
  console.log('─'.repeat(60));

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log(`\n📊 响应状态: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 请求失败:', errorText);
      return;
    }

    console.log('✅ 连接成功！开始接收流式数据...\n');

    // 解析 SSE 流
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let chunkCount = 0;

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        console.log('\n─'.repeat(60));
        console.log('✅ 流式接收完成！');
        console.log(`📊 统计: 共接收 ${chunkCount} 个数据块`);
        console.log(`📝 完整内容 (${fullContent.length} 字符):`);
        console.log(fullContent);
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          if (data === '[DONE]') {
            console.log('\n✅ 收到 [DONE] 信号');
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;

            if (content) {
              chunkCount++;
              fullContent += content;
              process.stdout.write(content); // 实时输出
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }

    console.log('\n\n✅ 测试成功！API Key 有效，流式功能正常！\n');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('错误详情:', error);
  }
}

// 运行测试
testStreamingAPI().catch(console.error);
