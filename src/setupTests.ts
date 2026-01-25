// Jest测试环境设置
import '@testing-library/jest-dom';

// 模拟Chrome扩展API
const mockChrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    },
    onInstalled: {
      addListener: jest.fn()
    }
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn()
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  scripting: {
    executeScript: jest.fn()
  }
};

// 设置全局chrome对象
(globalThis as any).chrome = mockChrome;