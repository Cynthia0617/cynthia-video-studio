# Cynthia Video Studio

Cynthia 的个人短视频制作项目。基于 React / Remotion，用可编辑分镜、逐句配音、字幕和音效制作 1080×1920 竖屏视频。

默认带一本账簿的知识视频示例：展开 → 定格圈注 → 字段落位 → 状态检查 → 页/册/库位关系 → 清册 → 互动收尾。它是可编辑的创作起点；换主题后需要同步改镜头画面，项目不承诺任意文案自动生成匹配画面。

![示例预览](docs/preview.png)

## 快速开始

需要 Node.js 22+、npm；重新合成旁白还需 Python 3（打包时用）、FFmpeg 和自己的火山引擎 TTS Key。直接预览示例不需要 API Key。首次导出可能由 Remotion 下载 Chromium。

```sh
npm ci
npm run check
npm run studio
npm run still -- demo 90
npm run render -- demo
```

成片位于 `out/demo/`，主片按 `001-题名.mp4` 命名，同时生成 `-无配乐版.mp4`。默认没有 BGM，因此示例两版声音相同；旁白和 CC0 音效可直接使用。

## 制作自己的视频

```sh
npm run new -- my-first-video
```

1. 在 `projects/my-first-video/brand.json` 改工作室名、栏目名、页脚及字体。
2. 在 `script.json` 写六段旁白，一段对应一镜。编辑 `src/episode.json` 的标题、编号和文件名前缀，以及 `src/timeline.json` 的六镜标题/引导语。
3. 改 `src/Scenes.tsx` 的具体画面；颜色在 `src/Shared.tsx`。沿用六个镜头 ID 可保留现有转场/音效映射，改变结构后须同步时间线和音效表。
4. 配置本地 `.env`，合成并实测音频，再生成时间线与字幕。

```sh
cp .env.example .env
# 只在自己电脑填入 Key；TTS 调用会使用你的服务额度。
npm run tts -- my-first-video
npm run timeline -- my-first-video
npm run studio -- my-first-video
npm run render -- my-first-video
```

`timeline` 以实测旁白延长镜头并保证留白，不会自动缩短原来的镜头。字幕按短句/字数估计时点，需预览核对；不宣称字级识别精度。自己录好的配音也可放进 `public/audio/` 并更新 `audio-timings.json`，不必调用 TTS。

## 音乐与音效

仅附带来源和许可齐全的 Freesound CC0 示例音效，见对应 `public/audio/sfx/`。原项目的 Carefree、每刻 logo、品牌资料、历史成片和本机 API 配置均未包含。

把自己的已获使用权音乐放进 `projects/你的项目/public/audio/private/`（Git 默认忽略），设置 `brand.json`：

```json
{"bgmSrc":"audio/private/my-bgm.mp3","bgmVolume":0.1}
```

这是修改字段的片段，保留文件中的其他字段。要卡拍，应先分析新曲节奏，再重排镜头；替换 BGM 后原示例的节拍相位和 21.333ms 输出补偿不能直接认定适用，应从新成片回测。

## 项目目录

- `projects/demo/`：可运行示例、旁白、分镜、品牌设置和 CC0 音效。
- `scripts/`：新建、预览、渲染、配音、基本检查、源码打包工具。
- `docs/WORKFLOW.md`：制作与交接流程。
- `.env.example`：只有配置字段，无密钥。
- `NOTICE` / `licenses/`：上游来源和授权记录。

```sh
npm run doctor -- demo
npm run smoke -- demo
npm run typecheck
npm run pack:source
```

源码包位于 `dist/cynthia-video-studio-source.zip`，不带 node_modules、缓存或成片。移机使用 `npm ci` 重装依赖。旧版 macOS 如需已有兼容浏览器/二进制，可通过 shell 环境变量 `REMOTION_BROWSER_EXECUTABLE`、`REMOTION_BINARIES_DIRECTORY` 指定；仓库不绑定任何人的绝对路径。Windows/Linux 请安装合适的中文字体，并在品牌配置和场景样式中替换字体。

## 来源

这是独立整理的个人创作工程，动效参考并改编自 [video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft)，保留其 Apache-2.0 授权和来源；没有将完整 skill 或作者的工作台改名冒充原创。依赖自身的许可见 THIRD_PARTY.md。
