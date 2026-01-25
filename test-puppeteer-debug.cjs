// Puppeteer 调试版本 - 检查存储
const puppeteer = require('./.claude/mcp-servers/extension-tester/node_modules/puppeteer');

async function testWithPuppeteer() {
  console.log('🧪 Puppeteer 调试测试\n');

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
  let extensionId = null;
  for (const target of targets) {
    const type = target.type();
    if (type === 'background_page' || type === 'service_worker') {
      const url = target.url();
      const match = url.match(/chrome-extension:\/\/([^\/]+)/);
      if (match) extensionId = match[1];
    }
  }

  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();

  // 监听所有请求
  page.on('request', request => {
    const url = request.url();
    if (url.includes('bigmodel.cn') || url.includes('bilibili.com')) {
      console.log(`  [请求] ${request.method()} ${url}`);
    }
  });

  // 监听响应
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('bigmodel.cn')) {
      const status = response.status();
      console.log(`  [响应] ${status} ${url}`);
      if (status >= 400) {
        const text = await response.text();
        console.log(`    错误: ${text.substring(0, 200)}`);
      }
    }
  });

  try {
    console.log('\n⚙️  配置 API...');
    const optionsUrl = `chrome-extension://${extensionId}/options.html`;
    await page.goto(optionsUrl, { waitUntil: 'networkidle2', timeout: 15000 });

    await page.waitForSelector('#apiKey', { timeout: 5000 });
    await page.evaluate(() => {
      document.querySelector('#apiKey').value = '519c90dbdfc44c2cb839c6b52195fd3a.hJBSKOskvOz4hSJG';
      document.querySelector('#apiUrl').value = 'https://open.bigmodel.cn/api/paas/v4';
      document.querySelector('#modelId').value = 'glm-4.6v-flash';
    });
    console.log('✅ 填写配置');

    // 点击保存按钮
    await page.evaluate(() => {
      const btn = document.querySelector('#saveBtn');
      if (btn) btn.click();
    });
    console.log('✅ 点击保存');

    // 等待保存完成
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 验证存储
    console.log('\n🔍 验证存储...');
    const storageCheck = await page.evaluate(async () => {
      return new Promise((resolve) => {
        chrome.storage.sync.get(['apiKey', 'apiUrl', 'modelId'], (result) => {
          resolve({
            apiKey: result.apiKey ? '已设置' : '未设置',
            apiUrl: result.apiUrl || '未设置',
            modelId: result.modelId || '未设置'
          });
        });
      });
    });
    console.log('存储状态:', JSON.stringify(storageCheck, null, 2));

    console.log('\n📺 访问测试视频...');
    await page.goto('https://www.bilibili.com/video/BV1NwrTB8EGQ', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    console.log('✅ 页面加载完成');

    console.log('\n🔍 检查视频信息...');
    const videoInfo = await page.evaluate(() => {
      return {
        url: window.location.href,
        hasBiliSummaryBtn: !!document.querySelector('.bilibili-summary-btn'),
        hasCurrentVideoInfo: typeof window.currentVideoInfo !== 'undefined'
      };
    });
    console.log('视频信息:', JSON.stringify(videoInfo, null, 2));

    console.log('\n🖱️  点击"AI摘要"按钮...');
    await page.evaluate(() => {
      const btn = document.querySelector('.bilibili-summary-btn');
      if (btn) btn.click();
    });
    console.log('✅ 按钮已点击');

    // 等待并观察模态框
    await new Promise(resolve => setTimeout(resolve, 3000));

    const modalCheck = await page.evaluate(() => {
      const modal = document.querySelector('.stream-modal');
      if (!modal) return { exists: false };

      return {
        exists: true,
        title: document.querySelector('.modal-header h3')?.textContent,
        status: document.querySelector('.status-badge')?.textContent,
        hasError: !!document.querySelector('.error-message'),
        errorText: document.querySelector('.error-message')?.textContent?.trim(),
        contentLength: document.querySelector('#streamContent')?.textContent?.length || 0
      };
    });
    console.log('\n模态框状态:', JSON.stringify(modalCheck, null, 2));

    if (modalCheck.exists) {
      await page.screenshot({ path: 'puppeteer_test_modal.png' });
      console.log('📸 截图保存: puppeteer_test_modal.png');

      // 等待更长时间观察
      console.log('\n⏳ 等待 15 秒观察...');
      await new Promise(resolve => setTimeout(resolve, 15000));

      const finalCheck = await page.evaluate(() => {
        return {
          title: document.querySelector('.modal-header h3')?.textContent,
          status: document.querySelector('.status-badge')?.textContent,
          isCompleted: document.querySelector('.status-badge')?.classList.contains('completed'),
          contentLength: document.querySelector('#streamContent')?.textContent?.length || 0,
          contentPreview: document.querySelector('#streamContent')?.textContent?.substring(0, 200) || ''
        };
      });
      console.log('\n最终状态:', JSON.stringify(finalCheck, null, 2));

      await page.screenshot({ path: 'puppeteer_test_final.png' });
      console.log('📸 截图保存: puppeteer_test_final.png');
    }

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
  } finally {
    // 保持浏览器打开 30 秒供观察
    console.log('\n⏳ 保持浏览器打开 30 秒供观察...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    await browser.close();
    console.log('\n👋 浏览器已关闭');
  }
}

testWithPuppeteer().catch(console.error);
