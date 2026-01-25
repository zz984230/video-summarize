#!/usr/bin/env node

/**
 * Chrome Extension Testing MCP Server
 *
 * This MCP server allows automated testing of Chrome extensions using Playwright.
 * It provides tools to:
 * - Launch Chrome with extensions loaded
 * - Navigate to web pages
 * - Interact with extension UI
 * - Capture screenshots and logs
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { chromium } from "playwright";

let browser = null;
let context = null;
let page = null;

// MCP Server
const server = new Server(
  {
    name: "extension-tester-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "launch_browser",
        description: "Launch Chrome browser with extension loaded",
        inputSchema: {
          type: "object",
          properties: {
            extensionPath: {
              type: "string",
              description: "Path to extension directory (e.g., D:\\\\code\\\\video-summarize\\\\dist)",
            },
            headless: {
              type: "boolean",
              description: "Run in headless mode (default: false for extensions)",
              default: false,
            },
          },
          required: ["extensionPath"],
        },
      },
      {
        name: "navigate_to",
        description: "Navigate to a URL",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "URL to navigate to",
            },
            waitForSelector: {
              type: "string",
              description: "CSS selector to wait for before returning",
            },
          },
          required: ["url"],
        },
      },
      {
        name: "click_element",
        description: "Click an element on the page",
        inputSchema: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              description: "CSS selector for the element",
            },
            timeout: {
              type: "number",
              description: "Timeout in milliseconds (default: 5000)",
              default: 5000,
            },
          },
          required: ["selector"],
        },
      },
      {
        name: "wait_for_element",
        description: "Wait for an element to appear",
        inputSchema: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              description: "CSS selector for the element",
            },
            timeout: {
              type: "number",
              description: "Timeout in milliseconds (default: 10000)",
              default: 10000,
            },
          },
          required: ["selector"],
        },
      },
      {
        name: "get_text",
        description: "Get text content of an element",
        inputSchema: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              description: "CSS selector for the element",
            },
          },
          required: ["selector"],
        },
      },
      {
        name: "get_content",
        description: "Get full page content including dynamically loaded content",
        inputSchema: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              description: "CSS selector for specific element (optional)",
            },
          },
        },
      },
      {
        name: "take_screenshot",
        description: "Take a screenshot of the current page",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Path to save screenshot (optional)",
            },
          },
        },
      },
      {
        name: "execute_script",
        description: "Execute JavaScript in the page context",
        inputSchema: {
          type: "object",
          properties: {
            script: {
              type: "string",
              description: "JavaScript code to execute",
            },
          },
          required: ["script"],
        },
      },
      {
        name: "get_console_logs",
        description: "Get console logs from the page",
        inputSchema: {
          type: "object",
          properties: {
            clear: {
              type: "boolean",
              description: "Clear logs after reading (default: false)",
              default: false,
            },
          },
        },
      },
      {
        name: "configure_extension",
        description: "Configure extension settings via options page",
        inputSchema: {
          type: "object",
          properties: {
            apiKey: {
              type: "string",
              description: "API key for the extension",
            },
            apiUrl: {
              type: "string",
              description: "API URL (optional, uses default if not provided)",
            },
            modelId: {
              type: "string",
              description: "Model ID (optional, uses default if not provided)",
            },
          },
          required: ["apiKey"],
        },
      },
      {
        name: "close_browser",
        description: "Close the browser",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

// Store console logs
const consoleLogs = [];

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "launch_browser": {
        const { extensionPath, headless = false } = args;

        // Close existing browser if any
        if (browser) {
          await browser.close();
        }

        // Launch browser with extension
        browser = await chromium.launch({
          headless,
          args: [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`,
          ],
        });

        // Create context
        context = await browser.newContext({
          viewport: { width: 1920, height: 1080 },
        });

        // Get extension background page
        const backgroundPages = context.backgroundPages();
        let backgroundPage = backgroundPages[0];

        if (!backgroundPage) {
          // Wait for background page to load
          backgroundPage = await context.waitForEvent("backgroundpage");
        }

        // Create new page
        page = await context.newPage();

        // Setup console log collection
        page.on("console", (msg) => {
          const logType = msg.type();
          const logText = msg.text();
          consoleLogs.push({
            type: logType,
            text: logText,
            timestamp: new Date().toISOString(),
          });
        });

        return {
          content: [
            {
              type: "text",
              text: `Browser launched with extension from ${extensionPath}`,
            },
          ],
        };
      }

      case "navigate_to": {
        if (!page) {
          throw new Error("Browser not launched. Call launch_browser first.");
        }

        const { url, waitForSelector } = args;

        // Clear console logs
        consoleLogs.length = 0;

        await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

        if (waitForSelector) {
          await page.waitForSelector(waitForSelector, { timeout: 15000 });
        }

        return {
          content: [
            {
              type: "text",
              text: `Navigated to ${url}`,
            },
          ],
        };
      }

      case "click_element": {
        if (!page) {
          throw new Error("Browser not launched. Call launch_browser first.");
        }

        const { selector, timeout = 5000 } = args;

        await page.waitForSelector(selector, { timeout });
        await page.click(selector);

        return {
          content: [
            {
              type: "text",
              text: `Clicked element: ${selector}`,
            },
          ],
        };
      }

      case "wait_for_element": {
        if (!page) {
          throw new Error("Browser not launched. Call launch_browser first.");
        }

        const { selector, timeout = 10000 } = args;

        await page.waitForSelector(selector, { timeout });

        return {
          content: [
            {
              type: "text",
              text: `Element found: ${selector}`,
            },
          ],
        };
      }

      case "get_text": {
        if (!page) {
          throw new Error("Browser not launched. Call launch_browser first.");
        }

        const { selector } = args;

        const element = await page.$(selector);
        if (!element) {
          throw new Error(`Element not found: ${selector}`);
        }

        const text = await element.textContent();

        return {
          content: [
            {
              type: "text",
              text: text || "",
            },
          ],
        };
      }

      case "get_content": {
        if (!page) {
          throw new Error("Browser not launched. Call launch_browser first.");
        }

        const { selector } = args;

        if (selector) {
          const element = await page.$(selector);
          if (!element) {
            throw new Error(`Element not found: ${selector}`);
          }
          const content = await element.innerHTML();
          return {
            content: [
              {
                type: "text",
                text: content,
              },
            ],
          };
        } else {
          const content = await page.content();
          return {
            content: [
              {
                type: "text",
                text: content,
              },
            ],
          };
        }
      }

      case "take_screenshot": {
        if (!page) {
          throw new Error("Browser not launched. Call launch_browser first.");
        }

        const { path } = args;

        const screenshot = await page.screenshot({
          path,
          fullPage: false,
        });

        if (path) {
          return {
            content: [
              {
                type: "text",
                text: `Screenshot saved to ${path}`,
              },
            ],
          };
        } else {
          // Return as base64
          const base64 = screenshot.toString("base64");
          return {
            content: [
              {
                type: "image",
                data: base64,
                mimeType: "image/png",
              },
            ],
          };
        }
      }

      case "execute_script": {
        if (!page) {
          throw new Error("Browser not launched. Call launch_browser first.");
        }

        const { script } = args;

        const result = await page.evaluate(script);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "get_console_logs": {
        const { clear = false } = args;

        const logs = [...consoleLogs];

        if (clear) {
          consoleLogs.length = 0;
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(logs, null, 2),
            },
          ],
        };
      }

      case "configure_extension": {
        if (!page) {
          throw new Error("Browser not launched. Call launch_browser first.");
        }

        const { apiKey, apiUrl, modelId } = args;

        // Navigate to extension options page
        const extensionId = await getExtensionId();
        await page.goto(
          `chrome-extension://${extensionId}/options.html`,
          { waitUntil: "networkidle" }
        );

        // Wait for form to load
        await page.waitForSelector('input[name="apiKey"]', { timeout: 5000 });

        // Fill in the form
        await page.fill('input[name="apiKey"]', apiKey);

        if (apiUrl) {
          await page.fill('input[name="apiUrl"]', apiUrl);
        }

        if (modelId) {
          await page.fill('input[name="modelId"]', modelId);
        }

        // Click save button
        await page.click('button[type="submit"]');

        // Wait for save confirmation
        await page.waitForTimeout(1000);

        return {
          content: [
            {
              type: "text",
              text: "Extension configured successfully",
            },
          ],
        };
      }

      case "close_browser": {
        if (browser) {
          await browser.close();
          browser = null;
          context = null;
          page = null;
        }

        return {
          content: [
            {
              type: "text",
              text: "Browser closed",
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Helper function to get extension ID
async function getExtensionId() {
  // Get all pages to find extension pages
  const pages = context.pages();
  for (const p of pages) {
    const url = p.url();
    const match = url.match(/chrome-extension:\/\/([^/]+)/);
    if (match) {
      return match[1];
    }
  }

  // Alternative: get from background page
  const backgroundPages = context.backgroundPages();
  if (backgroundPages.length > 0) {
    const url = backgroundPages[0].url();
    const match = url.match(/chrome-extension:\/\/([^/]+)/);
    if (match) {
      return match[1];
    }
  }

  throw new Error("Could not determine extension ID");
}

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("Extension Tester MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
