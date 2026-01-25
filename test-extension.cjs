// 增强版测试脚本 - 包含诊断功能
const playwright = require('./.claude/mcp-servers/extension-tester/node_modules/playwright');

async function testExtension() {
  console.log('🧪 开始测试 Bilibili 视频总结扩展\n');

  const browser = await playwright.chromium.launch({
    headless: false,
    args: [
      `--disable-extensions-except=D:\\code\\video-summarize\\dist`,
      `--load-extension=D:\\code\\video-summarize\\dist`
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const consoleLogs = [];
  const page = await context.newPage();
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('🎬') || text.includes('Background') || text.includes('Content')) {
      consoleLogs.push({
        type: msg.type(),
        text: text,
        timestamp: new Date().toISOString()
      });
    }
  });

  // 同时监听所有网络请求
  const apiRequests = [];
  page.on('request', request => {
    const url = request.url();
    if (url.includes('bigmodel.cn') || url.includes('modelscope')) {
      apiRequests.push({
        method: request.method(),
        url: url,
        timestamp: new Date().toISOString()
      });
    }
  });

  try {
    // 首先检查扩展是否加载
    console.log('🔍 步骤 0: 检查扩展加载状态...');

    // 等待一下让扩展完全加载
    await page.waitForTimeout(3000);

    // 获取所有背景页面
    const backgroundPages = context.backgroundPages();
    console.log(`背景页面数量: ${backgroundPages.length}`);

    if (backgroundPages.length > 0) {
      const bgUrl = backgroundPages[0].url();
      console.log(`✅ 扩展背景页面: ${bgUrl}`);
    } else {
      console.log('⚠️  未找到背景页面，尝试等待...');
      try {
        const bgPage = await context.waitForEvent('backgroundpage', { timeout: 5000 });
        console.log(`✅ 扩展背景页面已加载: ${bgPage.url()}`);
      } catch (e) {
        console.log('❌ 扩展可能未正确加载');
      }
    }

    console.log('\n📺 步骤 1: 访问测试视频...');
    await page.goto('https://www.bilibili.com/video/BV1NwrTB8EGQ', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    console.log('✅ 页面加载完成');

    // 检查页面中的视频信息
    console.log('\n🔍 诊断: 检查页面元素...');
    const videoInfo = await page.evaluate(() => {
      return {
        hasBiliSummaryBtn: !!document.querySelector('.bilibili-summary-btn'),
        hasVideoInfo: !!window.currentVideoInfo,
        url: window.location.href,
        title: document.querySelector('h1')?.textContent || 'N/A'
      };
    });
    console.log('页面诊断:', JSON.stringify(videoInfo, null, 2));

    console.log('\n🔍 步骤 2: 等待"AI摘要"按钮出现...');
    try {
      // 增加等待时间到 15 秒
      await page.waitForSelector('.bilibili-summary-btn', { timeout: 15000 });
      console.log('✅ "AI摘要"按钮已出现');
      await page.screenshot({ path: 'test_screenshot_1_button.png' });
      console.log('📸 截图已保存: test_screenshot_1_button.png');
    } catch (e) {
      console.log('❌ "AI摘要"按钮未出现');
      console.log('可能的原因:');
      console.log('  1. Content script 未注入');
      console.log('  2. 页面 URL 格式不匹配');
      console.log('  3. 扩展 manifest 配置问题');

      // 检查 content script 是否存在
      const contentScriptCheck = await page.evaluate(() => {
        return {
          hasChrome: typeof chrome !== 'undefined',
          hasChromeRuntime: typeof chrome?.runtime !== 'undefined',
          hasCurrentVideoInfo: typeof window.currentVideoInfo !== 'undefined'
        };
      });
      console.log('Content Script 检查:', JSON.stringify(contentScriptCheck, null, 2));

      // 最终截图
      await page.screenshot({ path: 'test_screenshot_debug.png' });
      console.log('📸 调试截图已保存: test_screenshot_debug.png');

      await browser.close();
      return;
    }

    const buttonText = await page.$eval('.bilibili-summary-btn .btn-text',
      el => el.textContent).catch(() => 'AI摘要');
    console.log(`按钮文字: ${buttonText}`);

    console.log('\n🖱️  步骤 3: 点击"AI摘要"按钮...');
    await page.click('.bilibili-summary-btn');
    console.log('✅ 按钮已点击');

    console.log('\n⏳ 步骤 4: 等待模态框出现...');
    try {
      await page.waitForSelector('.stream-modal', { timeout: 5000 });
      console.log('✅ 模态框已弹出');

      const title = await page.$eval('.modal-header h3', el => el.textContent);
      const status = await page.$eval('.status-badge', el => el.textContent);
      console.log(`标题: ${title}`);
      console.log(`状态: ${status}`);

      await page.screenshot({ path: 'test_screenshot_2_modal.png' });
      console.log('📸 截图已保存: test_screenshot_2_modal.png');
    } catch (e) {
      console.log('❌ 模态框未出现:', e.message);
      await browser.close();
      return;
    }

    console.log('\n📊 步骤 5: 监控流式内容增长...');
    const checkpoints = [5, 15, 30, 45];
    let lastLength = 0;

    for (const seconds of checkpoints) {
      await page.waitForTimeout(seconds * 1000);

      const contentLength = await page.$eval('#streamContent',
        el => el?.textContent?.length || 0).catch(() => 0);
      const contentPreview = await page.$eval('#streamContent',
        el => el?.textContent?.substring(0, 50) || '').catch(() => '');
      const status = await page.$eval('.status-badge',
        el => el.textContent).catch(() => 'unknown');

      console.log(`⏱️  ${seconds}秒: 长度=${contentLength}, 状态=${status}`);
      if (contentPreview) {
        console.log(`   预览: ${contentPreview}...`);
      }

      lastLength = contentLength;
    }

    console.log('\n✅ 步骤 6: 检查最终状态...');
    const finalStatus = await page.$eval('.status-badge', el => ({
      text: el.textContent,
      isCompleted: el.classList.contains('completed')
    }));

    const finalTitle = await page.$eval('.modal-header h3', el => el.textContent);
    const copyBtnDisabled = await page.$eval('.copy-btn', el => el.disabled);
    const finalContent = await page.$eval('#streamContent', el => el?.textContent || '');

    console.log('最终状态:');
    console.log(`  标题: ${finalTitle}`);
    console.log(`  状态: ${finalStatus.text}`);
    console.log(`  是否完成: ${finalStatus.isCompleted}`);
    console.log(`  复制按钮: ${copyBtnDisabled ? '禁用' : '启用'}`);
    console.log(`  内容长度: ${finalContent.length} 字符`);

    await page.screenshot({ path: 'test_screenshot_3_final.png' });
    console.log('📸 截图已保存: test_screenshot_3_final.png');

    console.log('\n📋 控制台日志 (扩展相关):');
    if (consoleLogs.length > 0) {
      consoleLogs.forEach(log => {
        console.log(`  [${log.type}] ${log.text}`);
      });
    } else {
      console.log('  (无扩展日志)');
    }

    console.log('\n🌐 API 请求记录:');
    if (apiRequests.length > 0) {
      apiRequests.forEach(req => {
        console.log(`  ${req.method} ${req.url}`);
      });
    } else {
      console.log('  (无 API 请求)');
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎉 测试完成！');
    console.log('='.repeat(50));
    console.log('\n测试结果:');
    console.log(`✅ 按钮出现: 是`);
    console.log(`✅ 模态框弹出: 是`);
    console.log(`✅ 流式内容: ${lastLength > 0 ? '是 (' + lastLength + ' 字符)' : '否'}`);
    console.log(`✅ 分析完成: ${finalStatus.isCompleted ? '是' : '否'}`);
    console.log(`✅ 复制功能: ${copyBtnDisabled ? '否 (禁用)' : '是 (启用)'}`);
    console.log(`\n截图文件:`);
    console.log(`  - test_screenshot_1_button.png`);
    console.log(`  - test_screenshot_2_modal.png`);
    console.log(`  - test_screenshot_3_final.png`);

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('错误堆栈:', error.stack);
  } finally {
    await browser.close();
    console.log('\n👋 浏览器已关闭');
  }
}

testExtension().catch(console.error);
