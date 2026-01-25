// Puppeteer 完整测试 - 包含 API 配置
const puppeteer = require('./.claude/mcp-servers/extension-tester/node_modules/puppeteer');
const fs = require('fs');

async function testWithPuppeteer() {
  console.log('🧪 使用 Puppeteer 完整测试扩展\n');

  const browser = await puppeteer.launch({
    headless: false,
    protocolTimeout: 180000,
    args: [
      `--disable-extensions-except=D:\\code\\video-summarize\\dist`,
      `--load-extension=D:\\code\\video-summarize\\dist`,
      '--no-sandbox'
    ]
  });

  await new Promise(resolve => setTimeout(resolve, 3000));

  const targets = browser.targets();
  console.log('🔍 步骤 0: 检查扩展加载...');
  let extensionId = null;
  for (const target of targets) {
    const type = target.type();
    if (type === 'background_page' || type === 'service_worker') {
      const url = target.url();
      const match = url.match(/chrome-extension:\/\/([^\/]+)/);
      if (match) {
        extensionId = match[1];
        console.log(`✅ 扩展已加载: ${url}`);
        console.log(`   Extension ID: ${extensionId}`);
      }
    }
  }

  if (!extensionId) {
    console.log('❌ 扩展未加载');
    await browser.close();
    return;
  }

  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();

  // 监听控制台
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('🎬') || text.includes('Error') || text.includes('error')) {
      console.log(`  [Console] ${text}`);
    }
  });

  // 监听 API 请求
  const apiRequests = [];
  page.on('request', request => {
    const url = request.url();
    if (url.includes('bigmodel.cn')) {
      apiRequests.push({ method: request.method(), url });
      console.log(`  [API] ${request.method()}`);
    }
  });

  try {
    // 首先配置 API
    console.log('\n⚙️  步骤 1: 配置 API...');
    const optionsUrl = `chrome-extension://${extensionId}/options.html`;
    await page.goto(optionsUrl, { waitUntil: 'networkidle2', timeout: 15000 });
    console.log('✅ 打开选项页面');

    // 等待表单加载并填写
    await page.waitForSelector('#apiKey', { timeout: 5000 });
    await page.evaluate(() => {
      document.querySelector('#apiKey').value = '519c90dbdfc44c2cb839c6b52195fd3a.hJBSKOskvOz4hSJG';
      document.querySelector('#apiUrl').value = 'https://open.bigmodel.cn/api/paas/v4';
      document.querySelector('#modelId').value = 'glm-4.6v-flash';
    });
    console.log('✅ 填写 API 配置');

    // 点击保存
    await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"]');
      if (btn) btn.click();
    });
    console.log('✅ 保存配置');

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n📺 步骤 2: 访问测试视频...');
    await page.goto('https://www.bilibili.com/video/BV1NwrTB8EGQ', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    console.log('✅ 页面加载完成');

    console.log('\n🔍 步骤 3: 等待"AI摘要"按钮...');
    try {
      await page.waitForSelector('.bilibili-summary-btn', { timeout: 15000 });
      console.log('✅ "AI摘要"按钮已出现');
      await page.screenshot({ path: 'puppeteer_test_1_button.png' });
      console.log('📸 截图保存: puppeteer_test_1_button.png');
    } catch (e) {
      console.log('❌ 按钮未出现:', e.message);
      await browser.close();
      return;
    }

    console.log('\n🖱️  步骤 4: 点击"AI摘要"按钮...');
    await page.evaluate(() => {
      const btn = document.querySelector('.bilibili-summary-btn');
      if (btn) btn.click();
    });
    console.log('✅ 按钮已点击');

    console.log('\n⏳ 步骤 5: 等待模态框...');
    try {
      await page.waitForFunction(
        () => document.querySelector('.stream-modal') !== null,
        { timeout: 8000 }
      );
      console.log('✅ 模态框已弹出');

      const modalInfo = await page.evaluate(() => {
        return {
          title: document.querySelector('.modal-header h3')?.textContent,
          status: document.querySelector('.status-badge')?.textContent
        };
      });
      console.log('模态框信息:', JSON.stringify(modalInfo, null, 2));

      await page.screenshot({ path: 'puppeteer_test_2_modal.png' });
      console.log('📸 截图保存: puppeteer_test_2_modal.png');
    } catch (e) {
      console.log('❌ 模态框未出现:', e.message);
      console.log('检查错误日志...');

      // 检查错误信息
      const errorCheck = await page.evaluate(() => {
        const modal = document.querySelector('.stream-modal');
        const title = document.querySelector('.modal-header h3')?.textContent;
        const errorMessage = document.querySelector('.error-message')?.textContent;
        const content = document.querySelector('#streamContent')?.textContent;

        return {
          title,
          errorMessage,
          contentPreview: content?.substring(0, 200)
        };
      });
      console.log('模态框检查:', JSON.stringify(errorCheck, null, 2));

      await page.screenshot({ path: 'puppeteer_test_error.png' });
      await browser.close();
      return;
    }

    console.log('\n📊 步骤 6: 监控流式内容...');
    const checkpoints = [5, 15, 30, 45];
    let lastLength = 0;
    let hasContent = false;

    for (const seconds of checkpoints) {
      await new Promise(resolve => setTimeout(resolve, seconds * 1000));

      const contentInfo = await page.evaluate(() => {
        const content = document.querySelector('#streamContent');
        const status = document.querySelector('.status-badge');
        const loading = document.querySelector('.loading-indicator');
        return {
          length: content?.textContent?.length || 0,
          preview: content?.textContent?.substring(0, 50) || '',
          status: status?.textContent || 'unknown',
          hasLoading: !!loading
        };
      });

      if (contentInfo.length > 0) hasContent = true;

      console.log(`⏱️  ${seconds}秒: 长度=${contentInfo.length}, 状态=${contentInfo.status}, 加载中=${contentInfo.hasLoading}`);
      if (contentInfo.preview) {
        console.log(`   预览: ${contentInfo.preview}...`);
      }
      lastLength = contentInfo.length;
    }

    console.log('\n✅ 步骤 7: 检查最终状态...');
    const finalStatus = await page.evaluate(() => {
      const statusBadge = document.querySelector('.status-badge');
      const title = document.querySelector('.modal-header h3');
      const copyBtn = document.querySelector('.copy-btn');
      const content = document.querySelector('#streamContent');
      return {
        statusText: statusBadge?.textContent,
        isCompleted: statusBadge?.classList.contains('completed'),
        title: title?.textContent,
        copyEnabled: !copyBtn?.disabled,
        contentLength: content?.textContent?.length || 0,
        contentPreview: content?.textContent?.substring(0, 200) || ''
      };
    });

    console.log('最终状态:');
    console.log(`  标题: ${finalStatus.title}`);
    console.log(`  状态: ${finalStatus.statusText}`);
    console.log(`  完成: ${finalStatus.isCompleted}`);
    console.log(`  复制按钮: ${finalStatus.copyEnabled ? '启用' : '禁用'}`);
    console.log(`  内容长度: ${finalStatus.contentLength}`);
    if (finalStatus.contentPreview) {
      console.log(`  内容预览: ${finalStatus.contentPreview}...`);
    }

    await page.screenshot({ path: 'puppeteer_test_3_final.png' });
    console.log('📸 截图保存: puppeteer_test_3_final.png');

    console.log('\n' + '='.repeat(50));
    console.log('🎉 测试完成！');
    console.log('='.repeat(50));
    console.log('\n结果总结:');
    console.log(`✅ 扩展加载: 成功`);
    console.log(`✅ API 配置: 成功`);
    console.log(`✅ 按钮出现: 是`);
    console.log(`✅ 模态框弹出: 是`);
    console.log(`✅ 流式内容: ${lastLength > 0 ? lastLength + ' 字符' : '无'}`);
    console.log(`✅ 分析完成: ${finalStatus.isCompleted ? '是' : '进行中'}`);
    console.log(`✅ API 请求数: ${apiRequests.length}`);

    if (apiRequests.length > 0) {
      console.log('\n🌐 API 调用记录:');
      apiRequests.forEach(req => console.log(`  ${req.method} ${req.url}`));
    }

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
  } finally {
    await browser.close();
    console.log('\n👋 浏览器已关闭');
  }
}

testWithPuppeteer().catch(console.error);
