# Cursor Atelier

Cursor Atelier 是一个轻量、纯浏览器端的 Windows 鼠标指针制作工具。图片解码、Canvas 绘制、CUR/ANI 编码和下载全部在本地完成，不需要后端、账户或云端存储。

## 功能

- PNG、JPG/JPEG → CUR
- 多张 PNG → ANI
- GIF → ANI
- GIF 任意单帧 → CUR
- 32×32、48×48、64×64 输出，默认推荐 32×32
- 等比例居中缩放，透明画布补齐
- 平滑缩放开关，关闭后适合像素画
- 点击画布或输入坐标设置热点
- GIF disposal 2/3 与局部帧合成
- Canvas 动画预览与全局播放速度调整
- 浏览器内指针测试区

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
