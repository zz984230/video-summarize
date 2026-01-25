// 简单的扩展测试脚本
const { chromium } = require('playwright');

async function testExtension() {
  console.log('🧪 开始测试 Bilibili 视频总结扩展\n');

  const browser = await chromium.launch({
    headless: false,
    args: [
      `--disable-extensions-except=D:\\code\\video-summarize\\dist`,
      `--load-extension=D:\\code\\video-summarize\\dist`
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  // 收集控制台日志
  const consoleLogs = [];
  const page = await context.newPage();
  page.on('console', msg => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      timestamp: new Date().toISOString()
    });
  });

  try {
    // 步骤 1: 访问测试视频
    console.log('📺 步骤 1: 访问测试视频...');
    await page.goto('https://www.bilibili.com/video/BV1NwrTB8EGQ', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    console.log('✅ 页面加载完成');

    // 步骤 2: 等待"AI摘要"按钮出现
    console.log('\n🔍 步骤 2: 等待"AI摘要"按钮出现...');
    try {
      await page.waitForSelector('.bilibili-summary-btn', { timeout: 10000 });
      console.log('✅ "AI摘要"按钮已出现');

      // 截图
      await page.screenshot({ path: 'test_screenshot_1_button.png' });
      console.log('📸 截图已保存: test_screenshot_1_button.png');
    } catch (e) {
      console.log('❌ "AI摘要"按钮未出现');
      console.log('控制台日志:', consoleLogs.slice(-5));
      await browser.close();
      return;
    }

    // 步骤 3: 检查按钮状态
    const buttonText = await page.$eval('.bilibili-summary-btn .btn-text',
      el => el.textContent).catch(() => 'AI摘要');
    console.log(`按钮文字: ${buttonText}`);

    // 步骤 4: 点击按钮
    console.log('\n🖱️  步骤 3: 点击"AI摘要"按钮...');
    await page.click('.bilibili-summary-btn');
    console.log('✅ 按钮已点击');

    // 步骤 5: 等待模态框出现
    console.log('\n⏳ 步骤 4: 等待模态框出现...');
    try {
      await page.waitForSelector('.stream-modal', { timeout: 5000 });
      console.log('✅ 模态框已弹出');

      // 检查初始状态
      const title = await page.$eval('.modal-header h3', el => el.textContent);
      const status = await page.$eval('.status-badge', el => el.textContent);
      console.log(`标题: ${title}`);
      console.log(`状态: ${status}`);

      // 截图
      await page.screenshot({ path: 'test_screenshot_2_modal.png' });
      console.log('📸 截图已保存: test_screenshot_2_modal.png');
    } catch (e) {
      console.log('❌ 模态框未出现:', e.message);
      await browser.close();
      return;
    }

    // 步骤 6: 监控流式内容
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

    // 步骤 7: 检查最终状态
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

    // 最终截图
    await page.screenshot({ path: 'test_screenshot_3_final.png' });
    console.log('📸 截图已保存: test_screenshot_3_final.png');

    // 步骤 8: 显示控制台日志
    console.log('\n📋 控制台日志 (最近10条):');
    const recentLogs = consoleLogs.slice(-10);
    recentLogs.forEach(log => {
      console.log(`  [${log.type}] ${log.text}`);
    });

    // 测试总结
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

// 运行测试
testExtension().catch(console.error);
