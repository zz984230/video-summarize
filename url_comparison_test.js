/**
 * URL对比测试
 * 对比Snapany API和我们解析器生成的URL差异
 */

const https = require('https');
const http = require('http');

// 模拟浏览器的fetch API
async function fetch(url, options = {}) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const isHttps = parsedUrl.protocol === 'https:';
        const httpModule = isHttps ? https : http;
        
        const requestOptions = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (isHttps ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };
        
        const req = httpModule.request(requestOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    ok: res.statusCode >= 200 && res.statusCode < 300,
                    status: res.statusCode,
                    statusText: res.statusMessage,
                    headers: res.headers,
                    json: async () => JSON.parse(data),
                    text: async () => data
                });
            });
        });
        
        req.on('error', reject);
        req.end();
    });
}

/**
 * 测试URL可访问性
 */
async function testUrlAccessibility(url, label) {
    console.log(`\n🔍 测试URL可访问性: ${label}`);
    console.log(`URL: ${url}`);
    
    try {
        const response = await fetch(url, {
            method: 'HEAD',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Referer': 'https://www.bilibili.com'
            }
        });
        
        console.log(`状态码: ${response.status} ${response.statusText}`);
        console.log(`响应头:`, response.headers);
        
        if (response.ok) {
            console.log(`✅ ${label} - 可访问`);
            return true;
        } else {
            console.log(`❌ ${label} - 不可访问`);
            return false;
        }
    } catch (error) {
        console.log(`❌ ${label} - 访问错误: ${error.message}`);
        return false;
    }
}

/**
 * 分析URL参数差异
 */
function analyzeUrlDifferences(url1, url2) {
    console.log('\n📊 URL参数对比分析:');
    
    const params1 = new URLSearchParams(url1.split('?')[1]);
    const params2 = new URLSearchParams(url2.split('?')[1]);
    
    const keys1 = new Set(params1.keys());
    const keys2 = new Set(params2.keys());
    
    console.log('\n共同参数:');
    for (const key of keys1) {
        if (keys2.has(key)) {
            const val1 = params1.get(key);
            const val2 = params2.get(key);
            if (val1 === val2) {
                console.log(`  ${key}: ${val1} (相同)`);
            } else {
                console.log(`  ${key}: ${val1} → ${val2} (不同)`);
            }
        }
    }
    
    console.log('\nURL1特有参数:');
    for (const key of keys1) {
        if (!keys2.has(key)) {
            console.log(`  ${key}: ${params1.get(key)}`);
        }
    }
    
    console.log('\nURL2特有参数:');
    for (const key of keys2) {
        if (!keys1.has(key)) {
            console.log(`  ${key}: ${params2.get(key)}`);
        }
    }
}

// 主测试函数
async function main() {
    console.log('='.repeat(80));
    console.log('🧪 B站视频URL对比测试');
    console.log('='.repeat(80));
    
    // Snapany提供的可访问URL
    const snapanyUrl = 'https://upos-sz-estgoss.bilivideo.com/upgcxcode/85/99/34277689985/34277689985-1-192.mp4?e=ig8euxZM2rNcNbRV7wdVhwdlhWdMhwdVhoNvNC8BqJIzNbfq9rVEuxTEnE8L5F6VnEsSTx0vkX8fqJeYTj_lta53NCM=&deadline=1764179989&uipk=5&os=estgoss&og=ali&oi=1782024106&nbs=1&platform=html5&trid=a7905328defd48b48382e8c85d2ea25h&mid=0&gen=playurlv3&upsig=9230d00498603b798bd0aa2a69dcd05f&uparams=e,deadline,uipk,os,og,oi,nbs,platform,trid,mid,gen&bvc=vod&nettype=0&bw=839770&buvid=&build=0&dl=0&f=h_0_0&agrr=0&orderid=0,1';
    
    // 我们解析器生成的URL（根据最新测试结果）
    const ourUrl = 'https://upos-sz-estgoss.bilivideo.com/upgcxcode/85/99/34277689985/34277689985-1-192.mp4?e=ig8euxZM2rNcNbRV7wdVhwdlhWdMhwdVhoNvNC8BqJIzNbfq9rVEuxTEnE8L5F6VnEsSTx0vkX8fqJeYTj_lta53NCM=&uipk=5&platform=html5&mid=0&og=ali&trid=f7be3c693d3f41d1845b01952576936h&nbs=1&oi=2015662086&gen=playurlv3&os=estgoss&deadline=1764180736&upsig=4a3aa0471280d16f247d4e17d21845ca&uparams=e,uipk,platform,mid,og,trid,nbs,oi,gen,os,deadline&bvc=vod&nettype=0&bw=839770&f=h_0_0&agrr=0&buvid=&build=0&dl=0&orderid=0,1';
    
    console.log('\n📋 测试URL可访问性:');
    await testUrlAccessibility(snapanyUrl, 'Snapany URL (已知可用)');
    await testUrlAccessibility(ourUrl, '我们的解析器URL');
    
    analyzeUrlDifferences(snapanyUrl, ourUrl);
    
    console.log('\n' + '='.repeat(80));
    console.log('🔍 关键差异分析:');
    console.log('1. 参数顺序不同');
    console.log('2. 某些参数值不同 (trid, deadline, upsig等动态参数)');
    console.log('3. 但都使用了 platform=html5 和 f=h_0_0');
    console.log('4. 这些差异可能是正常的，因为URL是动态生成的');
    console.log('='.repeat(80));
}

// 运行测试
if (require.main === module) {
    main().catch(console.error);
}