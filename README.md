# AI 芯片工程研习室

中文学习课程与交互网站：从算法到 RTL，从算子图到架构性能，让每一步都有可核验的证据。

- 在线学习：https://andyzr-coder.github.io/ai-workflow-learning-lab/
- 离线 PDF：https://andyzr-coder.github.io/ai-workflow-learning-lab/downloads/ai-workflow-handbook.pdf
- 离线 HTML：https://andyzr-coder.github.io/ai-workflow-learning-lab/downloads/ai-workflow-handbook.html
- 来源索引：https://andyzr-coder.github.io/ai-workflow-learning-lab/downloads/sources.json
- 实际 RTL 运行证据：https://andyzr-coder.github.io/ai-workflow-learning-lab/downloads/validation-report.json

## 课程范围

面向已有计算机体系结构、数字逻辑基础的读者，默认三天建立主线、两周完成项目。内容覆盖完整 83:45 录屏的匿名技术归纳，并补充截至 2026-11-08 核对的官方文档、原始论文与作者代码。主要技术发言至约 79:28；后段为摘要画面和短音频事件。录屏开始于介绍中途，不补造未录入的内容。

11 个模块、33 道开放练习、5 个交互实验、7 条工作流、30 项来源及 17 段时间线。课程同时包含解释、画图、估算、反例、调试和设计活动；参考答案默认折叠，开放题采用自评量表。

必须掌握规格、数值误差、流水线、独立验证、资源模型、融合与校准。深入工具与设计搜索按章节标识选学。网站分别记录“读过”和能力证据，支持搜索、知识依赖、横向关联、笔记、JSON 备份和可调整间隔复习。只用浏览器本地存储，没有服务端账户或遥测。

录屏页面可选取电脑上的原视频按时间码回看；使用浏览器本地文件引用，不上传视频。公开仓库不包含原始录音、视频、截图、逐字稿、内部源码或参与人员信息。

## 快速运行

需要 Node.js 20+，静态网站没有第三方运行时依赖。

~~~sh
npm test
npm run build
npm start
~~~

打开终端打印的本地网址（默认 http://127.0.0.1:4173/）。构建输出为 dist，可部署在 GitHub Pages 子目录。下载离线 HTML 可直接阅读全部课程，PDF 含展开的答案；交互实验在网站中运行。

## 内容与界面分离

~~~text
content/course.json    # 唯一课程内容源：模块、路线、时间线、来源、练习、实验说明
src/                   # 静态界面、状态、教学模型与交互
examples/sat-add/      # 可复现 SystemVerilog 示例和独立 testbench
tests/                 # 数学/队列模型边界与不变量检查
tools/build.cjs        # 生成网站、离线 HTML、课程/来源 JSON
tools/build-pdf.cjs    # 由共享内容生成中文 PDF
tools/test-rtl.cjs     # 实际 RTL 验证与变异测试
tools/browser-qa.cjs   # Playwright 浏览器验收
dist/downloads/        # 可发布的离线交付物和运行证据
~~~

换主题时修改共享数据与课程 id，保留界面基础；新的实验需实现相应模型并验证。导入备份检查课程、已知 ID 和字段，不执行数据内容。进度保存在当前浏览器，换设备或清除数据前请导出。

## 已执行验证

- 课程引用、先修无环、来源 ID、练习答案与页面内容完整性。
- 近似误差上界/饱和、流水线守恒与背压、独立 oracle 反例、Pareto 空可行域、Roofline 手算。
- Verible 和 Verilator lint；Icarus Verilog 执行 65,536 对算术输入以及 400 周期握手/背压/复位检查，共 65,942 项检查。
- 故意将饱和加法改成回绕加法，确认测试失败。成功与失败都保存在验证报告中。
- 桌面与手机布局、导航、搜索、作答、自评、保存/刷新、导入导出、复习、全部交互实验和本地视频引用。

可单独运行：

~~~sh
node --test tests/models.test.cjs
node tools/test-rtl.cjs
~~~

RTL 检查需要 Verible、Verilator、Icarus/vvp。脚本在 Windows 默认使用 F:/eda_tools 下的已有工具，Linux 使用 PATH。具体版本以 validation-report.json 为准；这不是 VerilogEval 基准结果。

浏览器验收需要 Playwright 和 Chromium，可通过 PLAYWRIGHT_MODULE、BROWSER_PATH、TEST_URL 指定环境。运行 npm start 后执行 node tools/browser-qa.cjs。PDF 构建需要 Pandoc、Eisvogel、XeLaTeX 和中文字体，参见构建脚本配置。

PDF 构建支持 PANDOC、XELATEX、EISVOGEL 环境变量。先执行 npm run build:pdf；所有源码提交后运行 node tools/package.cjs，再运行 node tools/validate-release.cjs 校验下载哈希、静态资产与离线跳转。source.zip 来自已提交的 HEAD，dist 不进入源码分支，避免递归打包。

## 模型和证据边界

1. 网页实验是明确简化的教学模型：线性插值和输出定点量化、弹性流水线、饱和加法、合成 PPA 候选、解析资源模型。
2. 它们不等于视频中的二次 FP32 SFU、XLS 编译器、完整协议仿真、物理设计流程或真实硬件预测。
3. η×峰值带宽是所选效率假设；只有当带宽被声明为速率上限时，Q/B 才能当作对应下界。延迟 L、发射间隔 II 和有限观察窗口吞吐分别统计。
4. 视频 PPA 结果只按画面/发言核对，未取得原始报告独立复现。前两轮显示的 setup slack 为负，最终转正；功耗是默认活动率估计，不能叫应用实测。
5. 本次真正执行的硬件工具只覆盖交付的小型 RTL 例子。未执行 XLS 全链路、OpenROAD 实现、PPA 测量或流片签核。
6. 官网产品描述是厂商声明，论文基准只在其数据集与版本范围内成立。课程不做跨版本成功率拼接或“最佳工具”排名。

## 发布与复现

main 保留完整源码，gh-pages 只发布 dist 内容。GitHub Pages 使用 gh-pages 分支根目录。原参考站 memory-architecture-lab 保持独立；新课程借鉴其学习导航与实验组织思路，采用共享数据以便复用。

课程内容为原创整理，原始文献和官方资料的权利归各作者；来源链接与阅读边界保存在 content/course.json。代码与原创课程内容采用 MIT License。

