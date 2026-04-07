# JobAnalyzer AI - Chrome 插件

智能求职分析 Chrome 插件，从 Boss直聘 等招聘网站提取 JD 并进行 AI 深度分析。

## 功能特性

- 🔍 **一键提取**: 自动识别页面上的职位名称、薪资、公司、JD 正文
- ⚡ **AI 深度分析**: 技能关键词提取、避雷预警、匹配度评分
- 🚨 **避雷提醒**: 自动检测 JD 中的危险信号（低薪、加班文化等）
- 🎯 **匹配度评估**: 基于关键词和 JD 完整度计算匹配分数

## 安装步骤

### 1. 加载插件到 Chrome

1. 打开 Chrome，访问 `chrome://extensions/`
2. 开启右上角的「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择本目录 `chrome-extension/`

### 2. 安装依赖

```bash
# 安装 Python 后端依赖
pip install fastapi uvicorn pydantic

# 或使用 uv
uv pip install fastapi uvicorn pydantic
```

### 3. 启动后端服务

```bash
cd C:\Users\ccyan\code\job-analyzer
python app.py
```

后端启动后会监听 `http://127.0.0.1:8000`

### 4. 使用插件

1. 打开 Chrome，访问 [Boss直聘](https://www.zhipin.com)
2. 进入任意职位详情页
3. 页面右侧「立即沟通」按钮旁边会出现 **⚡ AI 深度分析** 按钮
4. 点击按钮，等待分析结果

## 项目结构

```
chrome-extension/
├── manifest.json      # MV3 配置文件
├── background.js      # Service Worker 后台脚本
├── content.js         # Content Script 核心逻辑
├── content.css        # 结果面板样式
├── popup.html         # 插件弹窗界面
├── popup.css          # 弹窗样式
├── popup.js           # 弹窗逻辑
└── icons/             # 插件图标 (需自行添加)
```

## 本地测试

### 测试后端 API

```bash
# 健康检查
curl http://127.0.0.1:8000/health

# 测试分析接口 (模拟)
curl -X POST http://127.0.0.1:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "jobTitle": "Python 后端开发",
    "company": "字节跳动",
    "salary": "25-40K",
    "jobDescription": "熟练掌握 Python、Django、MySQL，熟悉 Docker，有良好的编码习惯。"
  }'
```

### 预期返回

```json
{
  "score": 75,
  "keywords": ["Python", "Django", "MySQL", "Docker"],
  "warnings": [],
  "analysis": "技术岗位：关注技术栈匹配度、代码规范、技术成长空间...",
  "suggestions": "简历建议突出以下关键词：Python, Django..."
}
```

## 注意事项

1. **CORS 问题**: 插件配置了 `host_permissions` 允许跨域请求本地后端
2. **页面兼容性**: 目前针对 Boss直聘 优化，其他招聘网站可能需要调整选择器
3. **后端依赖**: 使用前请确保 Python 后端已启动

## 扩展到其他网站

如需支持其他招聘网站，修改 `content.js` 中的 `CONFIG.TARGET_SELECTORS`:

```javascript
const CONFIG = {
  TARGET_SELECTORS: {
    jobTitle: '.job-title h1, .info-primary h1',  // 调整选择器
    salary: '.salary',
    company: '.company-name',
    jobDesc: '.job-detail-content, .job-sec-text',
    // ...
  }
};
```

## 图标

请在 `icons/` 目录下添加以下尺寸的图标文件:
- `icon16.png` (16x16)
- `icon48.png` (48x48)
- `icon128.png` (128x128)

可以使用在线工具如 [Favicon Generator](https://favicon.io/) 生成。

## License

MIT
