# Cursor Atelier光标工作室

Cursor Atelier 是一个轻量、纯Web端的 Windows 鼠标指针自定义工具。图片解码、Canvas 绘制、CUR/ANI 编码和下载全部在本地完成。

## 功能

- PNG、JPG/JPEG → CUR
- 多张 PNG → ANI
- GIF → ANI
- GIF 任意单帧 → CUR
- 32×32、48×48、64×64 输出
- 等比例居中缩放，透明画布补齐
- 平滑缩放开关，关闭后适合像素画
- 点击画布或输入坐标设置热点
- GIF disposal 2/3 与局部帧合成
- Canvas 动画预览与全局播放速度调整
- 浏览器内指针测试区
- 基础版：制作单个 CUR/ANI；进阶版：分别配置 Windows 15 个经典指针状态
- 进阶版导出 ZIP，包含全部 CUR/ANI、`install.inf` 和中英双语安装说明

## 安装指针方案

在进阶版中为 15 个状态导入素材；可先设置“正常选择”，再用它补齐空白状态，然后逐一替换。各状态的热点、平滑缩放和动画速度互不影响，输出尺寸对整套方案统一生效。

下载 ZIP 后，**先完整解压**，右键 `install.inf` 选择“安装”（Windows 11 可能需要“显示更多选项”）。再打开“鼠标属性 → 指针”，从“方案”下拉框选择导入的方案，点击“应用”。`install.inf` 会将指针复制到 Windows 的 Cursors 目录并注册当前用户的方案；它不会自动应用方案。Windows 的安装文件扩展名是 `.inf`，不是 `.ini`。

## 本地开发

需要 Node.js 22.12+ 或 24+。

```bash
npm install
npm run dev
```

完整验证：

```bash
npm test
npm run lint
npm run build
```

## Windows App

仓库同时包含一个轻量的 Tauri 2 桌面封装，复用同一套 React/Canvas 代码。桌面版导出时会打开 Windows 原生“另存为”窗口，文件仍只在本机处理。

- 安装包由 GitHub Actions 在 Windows 环境构建。
- 可在仓库的 **Releases** 页面下载 `-setup.exe`。
- 安装包发行者元数据和项目署名为 `Ts1ngyun`，NSIS 安装向导提供简体中文和英文。由于安装包目前**没有代码签名**，Windows SmartScreen 仍可能显示“未知发布者”或风险警告；仅修改署名无法消除该提示，请核对 GitHub Release 来源后再自行决定是否安装。
- 本机构建需要 Rust、Microsoft C++ Build Tools 和 Node.js；仅开发网站时不需要这些工具。
- 发布新版本时先同步修改 `package.json`、`src-tauri/Cargo.toml` 和 `src-tauri/tauri.conf.json` 中的版本号。

本地已安装 Tauri 工具链后，可运行：

```bash
npx @tauri-apps/cli@^2 dev
npx @tauri-apps/cli@^2 build
```

生成无版权的本地烟雾测试素材：

```bash
node scripts/generate-smoke-fixtures.mjs
```

素材会写入已被 Git 忽略的 `samples-private/`。

## 文件格式实现

- CUR 由项目自己的 `encodeCur()` 生成，包含一个 PNG 图像、尺寸和热点坐标。
- ANI 由项目自己的 `encodeAni()` 生成，使用 RIFF `ACON`、`anih`、`rate` 和 `LIST fram`。
- 当前动画按自然帧顺序播放，因此不写不必要的 `seq ` 块。
- GIF 延迟会转换为 ANI 的 1/60 秒 jiffies。
- GIF 解码使用 MIT 许可的 `gifuct-js`，帧合成与 disposal 处理由本项目实现。

更多结构说明见 [docs/FORMAT_NOTES.md](docs/FORMAT_NOTES.md)。

## 安全限制

- 单文件最大 20 MB。
- 多张 PNG 最多 120 张。
- GIF 最多 240 帧，并限制解码后的总像素量。
- 用户素材不应提交到仓库；本地样本请放入 `samples-private/`。

## Windows 验证

自动测试会验证二进制结构，但最终兼容性仍应在 Windows 10 和 Windows 11 上用真实指针设置验证。步骤见 [docs/WINDOWS_VALIDATION.md](docs/WINDOWS_VALIDATION.md)。

## License

[MIT](LICENSE)
