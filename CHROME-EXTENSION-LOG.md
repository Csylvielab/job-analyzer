# Chrome Extension 开发日志

## 概述

为 job-analyzer 项目开发 Chrome Extension (Manifest V3)，目标是从 Boss直聘 提取 JD 并调用后端 AI 分析。

---

## 文件结构

```
job-analyzer/
├── chrome-extension/           # Chrome 插件目录
│   ├── manifest.json          # MV3 配置
│   ├── content.js             # 核心逻辑：DOM提取、按钮注入、API调用
│   ├── content.css            # 结果面板样式
│   ├── background.js          # Service Worker
│   ├── popup.html             # 插件弹窗
│   ├── popup.css
│   ├── popup.js
│   └── README.md              # 使用说明
├── app.py                     # FastAPI 后端 Wrapper（独立版本，未使用）
└── CHROME-EXTENSION-LOG.md   # 本文档
```

---

## 开发进度

### Phase 1: 基础架构搭建 ✅

- [x] 创建 manifest.json (Manifest V3)
- [x] 创建 content.js 核心逻辑
- [x] 创建 content.css 面板样式
- [x] 创建 popup 弹窗界面
- [x] 创建 background.js

### Phase 2: 后端对接 ✅

- [x] 添加 FastAPI wrapper (app.py)
- [x] 修改 Next.js API 添加 CORS 支持
- [x] 处理流式响应

### Phase 3: 部署 🚧

- [x] 推送到 GitHub
- [x] Vercel 部署配置
- [ ] 验证 Vercel 部署状态
- [ ] 线上环境测试

---

## 卡点记录

### 1. 图标文件缺失
**问题**: `Could not load icon 'icons/icon16.png' specified in 'icons'`
**原因**: manifest.json 引用了不存在的图标文件
**解决**: 移除 manifest.json 中的图标配置

### 2. Popup 连接检测不准确
**问题**: popup 显示"后端未连接"，但实际可能已连接
**原因**: HEAD 请求不被 FastAPI/Next.js 支持
**解决**: 改为检测根路径或忽略状态检测

### 3. Next.js 流式响应
**问题**: popup 的 `fetch().json()` 无法处理流式响应
**原因**: Next.js /api/analyze 使用 streamText 返回流式数据
**解决**: 改为由 content script 处理整个流程（提取 → 调用API → 显示结果）

### 4. Content Script 消息传递
**问题**: `chrome.tabs.sendMessage` 失败 "Receiving end does not exist"
**原因**:
  - content script 未加载
  - popup 发送消息时 tab 还没有 content script
**解决**: 改用 `return true` 异步响应，并在 startAnalysis 消息中处理完整流程

### 5. CORS 跨域错误
**问题**: `The value of the 'Access-Control-Allow-Origin' header must not be the wildcard '*' when the request's credentials mode is 'include'`
**原因**: fetch 使用 `credentials: 'include'` 与 CORS `*` 通配符冲突
**解决**: 移除 `credentials: 'include'`

### 6. JD 提取选择器不匹配
**问题**: 选择器 `.job-sec-text` 等可能不匹配 Boss直聘 当前 DOM
**解决**: 多次尝试不同选择器，备用方案使用正则匹配页面文本

### 7. Next.js 端口占用
**问题**: `Port 3000 is in use by process xxx`
**原因**: 上一个 dev server 未关闭
**解决**: `taskkill /PID xxx /F` 或 `Ctrl+C` 重启

### 8. Vercel 部署失败
**问题**: `job-analyzer-t19q.vercel.app 无法访问`
**原因**: 部署可能失败或还在构建
**状态**: 待排查

---

## 技术要点

### Content Script 消息处理
```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startAnalysis') {
    (async () => {
      // 异步处理
      sendResponse({ success: true });
    })();
    return true; // 异步响应
  }
  return true;
});
```

### CORS 配置 (Next.js API Route)
```typescript
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, X-AI-Provider',
    },
  });
}
```

### Boss直聘 DOM 选择器
```javascript
const CONFIG = {
  TARGET_SELECTORS: {
    jobTitle: '.job-title h1, .info-primary h1, .job-name',
    salary: '.salary, .info-primary .salary',
    company: '.company-name, .info-primary .name',
    jobDesc: '.job-detail-content, .job-sec-text, .detail-content'
  }
};
```

---

## 当前状态

| 项目 | 状态 | 备注 |
|------|------|------|
| 本地开发服务器 | ⚠️ 需重启 | 3000 端口占用，需 kill 后重启 |
| Vercel 部署 | ❓ 未知 | 无法访问，待排查 |
| JD 提取 | ✅ 正常 | 能提取 857+ 字符 |
| CORS | ✅ 已修复 | 需服务器重启生效 |
| API Key | ⚠️ 待确认 | 需在插件设置中配置 |

---

## 下一步

1. **重启本地 Next.js**
   ```bash
   taskkill /PID 44668 /F
   npm run dev
   ```

2. **检查 Vercel 部署**
   - 登录 Vercel Dashboard
   - 查看部署状态
   - 检查 .env 配置（API Key）

3. **配置 API Key**
   - 在插件 popup 设置中配置 DeepSeek API Key

4. **完整测试**
   - 确认 JD 提取正常
   - 确认分析返回结果
   - 确认结果面板渲染正确

---

## 相关资源

- [Chrome Extension Manifest V3 文档](https://developer.chrome.com/docs/extensions/mv3/)
- [Boss直聘](https://www.zhipin.com)
- [Vercel](https://vercel.com)
- [Next.js AI SDK](https://sdk.vercel.ai/)
