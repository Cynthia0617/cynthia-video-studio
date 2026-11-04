# 验证记录

2026-11-04：从独立目录安装 253 个 npm 依赖，并生成 package-lock.json；不依赖旧工作区的 node_modules 链接。

- npm run check：通过，检查可打包文件、基本凭据模式、绝对本机路径、时间线连续性和音频资源。
- npm run typecheck：通过。
- npm run smoke -- demo：实际导出60帧/约2秒测试片，1080×1920、H264、AAC48kHz；画面已抽帧检查，预览见 preview.png。
- npm run pack:source：ZIP 可完整读取，不含 node_modules、缓存、成片、私有素材目录或 .env。

测试机为 macOS，使用本机兼容浏览器/二进制的环境变量；这些绝对路径未写入仓库。其他系统与完整长片未在此轮执行；新TTS服务调用未执行，避免消耗用户额度。新机器须安装字体及所需外部工具。

本轮新增的是独立工具链和个人化入口，没有重新生成全部历史视频。
