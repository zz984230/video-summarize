@echo off
echo ========================================
echo Extension Tester MCP Server 安装脚本
echo ========================================
echo.

REM 切换到 MCP 服务器目录
cd /d "%~dp0.claude\mcp-servers\extension-tester"

echo [1/2] 安装依赖...
call npm install
if errorlevel 1 (
    echo 错误: npm install 失败
    pause
    exit /b 1
)

echo.
echo [2/2] 配置 Claude Code...
call node setup.js

echo.
echo ========================================
echo 安装完成！
echo ========================================
echo.
echo 下一步:
echo 1. 重启 Claude Code
echo 2. 在 Claude Code 中输入测试命令
echo.
echo 示例命令:
echo   "使用 extension-tester 测试扩展：启动浏览器 D:\code\video-summarize\dist，配置 API，访问 https://www.bilibili.com/video/BV1NwrTB8EGQ"
echo.
pause
