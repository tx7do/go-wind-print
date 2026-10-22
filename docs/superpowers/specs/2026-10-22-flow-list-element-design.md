# 流式列表元素方案评估（GitHub issue #5）

> 状态：**方案评估，未拍板，暂不实施**。本文只登记需求、代码事实与候选方案，不代表已选定形态；任何一行代码都未改动。
> 记录时间：2026-10-22　记录人：代理（视觉伴侣屏由维护者会话生成）

## 一、需求出处

- GitHub issue [#5](https://github.com/worm-longliu/worm-vue3-print/issues/5)：`[功能建议]是否可以支持「流式列表」元素：列表数据按自然宽度横向流式排布、自动换行`
- 提行人：`Mr-wangwei`（wangwei），2026-10-22 01:14 提出，标签为空，状态 OPEN。
- 场景原文：中药处方单的药材排列。一张处方 7 味药，希望排成：

```text
黄芪  20g   当归尾  15g   赤芍  10g   川芎  10g
地龙  10g   桃仁    10g   红花  10g
```

- 附件截图：`https://github.com/user-attachments/assets/b67230b3-d75f-45b9-b951-8f0b546fe44d`
  **本机未取到、未做图像判读**。原因：开发机到 `github.com` 与 `objects.githubusercontent.com` 的 443 端口 TCP 层不通（`github.com` 解析为 `20.205.243.166`，连接超时），系统无 HTTP/SOCKS 代理；`api.github.com`、`uploads.github.com`、`media.githubusercontent.com` 等可达但服务不到该附件。截图里的版式（每行几列、剂量是否成列对齐）仍是未知。
- 维护者已在 issue 内反问：**「需要指定每行的列数吗」**，提行人尚未回复。这一问正好是下面的分叉点。

## 二、现有代码事实（坐标已逐行复核）

| # | 事实 | 坐标 |
| --- | --- | --- |
| 1 | 元素类型是字符串字面量联合，共 12 种：`text / image / longText / table / hline / vline / rect / oval / barcode / qrcode / html / pageNumber` | `packages/print-core/src/designer/types.ts:94` |
| 2 | 所有可配置项挤在单一 `ElementOptions` 接口，无按类型的属性 registry | `packages/print-core/src/designer/types.ts:256-349` |
| 3 | 元素定位是绝对坐标毫米（`left/top/width/height`），模板单位 `mm` | `packages/print-core/src/designer/types.ts:257-260`、`src/render/css-builder.ts:383-403` |
| 4 | 出纸 HTML 按类型分派集中在一个 `switch` | `packages/print-core/src/render/html-generator.ts:432` |
| 5 | 三端共用同一份生成代码：浏览器、服务端 PDF、桌面客户端都只换驱动，渲染入口同为 core 管线 | `src/print/pipeline.ts:31`、`src/browser/browser-pagination.ts:42`、`services/print-render/src/pdf-render.ts:5`、`clients/print-client/src/main/print-engine.ts:13` |
| 6 | **数组数据目前只有表格能消费**；非表格元素的上下文只有整份业务数据 | `packages/print-core/src/render/data-binder.ts:86`、`:126` |
| 7 | 表格列宽是固定毫米数组 `tableColWidths`，默认 50/50/50；出纸强制 `table-layout:fixed` | `src/designer/types.ts:336`、`src/render/html-generator.ts:696` |
| 8 | 表达式函数表只有 `CONCAT` 这类字符串拼接，无「数组逐项拼成一句」的函数 | `packages/print-core/src/render/expression-eval.ts:52-72` |
| 9 | 长文本已具备「按内容自然高度撑开 + 自动换行」，但换行口径是任意字符处切断（`word-break:break-all`） | `src/render/text-fit.ts:22-25`、`src/render/html-generator.ts:410-413`、`src/render/html-generator.ts:575-577` |
| 10 | 项目里**唯一的流式落位机制**是「表格下方跟随区」`flow-group`：用相对定位容器覆盖绝对定位，随表格切片实际底部走 | `src/render/pagination-engine.ts:704`、`src/render/html-generator.ts:785` |
| 11 | 管线是「先绑定、再测量、再分页、最后成形」的单份流程，测量趟在分页趟之前 | `src/print/pipeline.ts:196`、`:203`、`:210`、`:213` |
| 12 | **画布设计态不跑分页引擎**：`paginate` 与 `pagination-engine` 在 print-canvas、print-common、clients、services 的非测试源码中零引用；画布元素纯绝对定位铺一次，设计器里只有预览弹窗走分页渲染 | `packages/print-canvas/src/components/elements/BaseElement.vue:113`、`packages/print-canvas/src/components/PrintHtmlPreview.vue:24` |
| 13 | 新增元素类型必须由 `Record<ElementType, …>` 穷举默认属性与中文标题，漏一处即编译不过 | `packages/print-core/src/designer/utils/element-factory.ts:9-53`、`:56-69` |
| 14 | 设计器有两套外壳需并行接入（Vue3 画布与零框架 Common），工具箱顺序与图标要求同源 | `packages/print-canvas/src/components/LeftPanel.vue:83`、`packages/print-common/src/shell/panels.ts:10`、`packages/print-common/src/shell/elements.ts:158` |

## 三、四档候选方案

### A　新增「流式列表」独立元素：能塞几个排几个

版式形态（同一份 7 味药数据）：

```text
黄芪 20g   当归尾 15g   赤芍 10g   川芎 10g
地龙 10g   桃仁 10g     红花 10g
```

- **存出什么值**：元素框（左、上、宽，高度由内容撑）；每单元的字段模板（药名、剂量）；单元间距；字号。
- **列数**：不指定，排满自动换行。
- **表达不了**：行间对齐。第二行「地龙」不会落在「黄芪」的列上，剂量也不成列——处方、价目类版式恰恰要这种成列感。
- **改动落点**：`designer/types.ts:94` 加类型 → `element-factory.ts:9-69` 补默认属性与标题（编译期强制）→ `html-generator.ts:432` 加分支 → `data-binder.ts:86` 让非表格元素消费数组 → `pagination-engine.ts:688-731` 加流式块的高度与落位口径 → `binding-registry.ts`、`zone-layout.ts`、`property-search.ts`、`migrate.ts` → 两套外壳的工具箱、元素渲染、属性台、图层图标。
- **成本**：最高一档，因为数组消费、流式高度、双壳接入都要新写。

### B　扩展现有表格：每行固定列数 + 列宽自适应

```text
┌──────┬─────┬───────┬─────┬──────┬─────┬──────┬─────┐
│ 黄芪 │ 20g │ 当归尾│ 15g │ 赤芍 │ 10g │ 川芎 │ 10g │
├──────┼─────┼───────┼─────┼──────┼─────┼──────┼─────┤
│ 地龙 │ 10g │ 桃仁  │ 10g │ 红花 │ 10g │      │     │
└──────┴─────┴───────┴─────┴──────┴─────┴──────┴─────┘
```

- **存出什么值**：每行列数（4）、列宽口径（自适应）、一行内的字段顺序。
- **列数**：必须指定，即维护者在 issue 里反问的那句。
- **好处**：剂量天然成列；表格已有的自动分页、表头重复、跨页续排、小计与边框能力全部白拿，不用新写分页。
- **要补的能力**：① 列宽目前只能是固定毫米（事实 7），需新增「由内容决定」这一档，出纸侧要把 `table-layout:fixed` 换成自动布局；② 数据目前只驱动行（事实 6），需要把一维数组按每行 N 味回填成多行。
- **代价**：最后一行不满留空格子；语义上它仍是「表格」，用户要理解「拿一张表当版式用」。
- **成本**：中等，且集中在表格自身，双壳属性台可沿用现成分组。

### C　表达式路线：一个长文本元素把数组拼起来自己折行

```text
黄芪 20g、当归尾 15g、赤芍 10g、川芎 10g、地龙 10g、桃仁 10g、红花 10g
```

- **存出什么值**：一个文本元素 + 一条表达式。列数这个概念不存在。
- **为什么现在不行**：函数表无数组逐项拼接（事实 8）；长文本换行是任意字符处切断（事实 9），会把「当归尾」切成「当归 / 尾」、把「10g」切成「1 / 0g」。
- **要补**：一个数组拼接函数 + 让成对内容粘住不被切断的排版规则（一处）。
- **代价**：间距行距全压在一个文本框里，无法对齐、无法跨页对账，处方读起来不像处方。
- **成本**：最低，但成品质量不可控。

### D　混合：新元素，排版交给自适应宽表格，列数由宽度算出来

```text
框宽 85mm 时（每行 4 味）              框宽 66mm 时（自动降为每行 3 味）
黄芪  20g  当归尾 15g  赤芍 10g  川芎 10g     黄芪  20g  当归尾 15g  赤芍 10g
地龙  10g  桃仁   10g  红花 10g              川芎  10g  地龙   10g  桃仁 10g
                                            红花  10g
```

- **存出什么值**：元素框宽度、每单元字段模板、单元最小宽度与间距；「每行列数」留空即自动，填了就用用户给的数。
- **列数**：不用指定也能成，指定了也听——把 A 与 B 的分叉做成一个可选项而不是二选一。
- **靠什么算列数**：用管线已有的测量趟拿单元实测宽度，再除以可用宽度得到每行几味（事实 11）。
- **关键未知（本文最重要的风险项）**：**画布设计态不跑测量与分页**（事实 12）。所以 D 在设计台上要么另写一套等效预估，要么接受「设计态所见列数」与「出纸列数」可能不一致。这条会显著改变工作量，必须由维护者拍板。
- **可复用**：项目唯一验证过的流式落位机制 `flow-group`（事实 10）证明了相对容器覆盖绝对定位这条路走得通。
- **成本**：比 B 多一个「算列数」模块，比 A 多一点测量依赖；收益是同时拿到「自动排布」和「成列对齐」。

## 四、推荐

推荐 **D**，理由：A 与 B 的分歧本质是「每行列数由谁说了算」，D 把它变成可选而非二选一；C 的切断是硬伤，不值得为省工去赌提行人能否接受。

次选 **B**：若维护者判定「算列数」与「设计态预估」这两项成本不划算，B 用固定列数换取表格全套分页能力，是最省事的可用解，也能直接回答 issue 里那句反问（「需要，每行列数由你指定」）。

## 五、待决清单

1. **每行列数口径**：固定列数（B/D 填值）／自然宽度不固定（A）／自动并可覆盖（D 留空）。← 已把这一问抛给提行人，等他回。
2. **跨页续排**：只在元素框内换行、一框一页（不动分页引擎，成本最低，覆盖「一页一张处方」）；还是要接分页引擎自动续到下一页（需新增流式块的分页游标与续排高度计算，三端都要实测）。
3. **设计态所见即所得**：画布要不要预估列数与行数（事实 12 决定了这是 D 的净新增成本）。
4. **截图判读**：需要提行人补一句「每行几列、剂量是否成列」，或维护者把截图存到本地后另行判读（按 AGENTS.md，图像判读须先获同意）。
5. **交付节奏**：是否值得为这一个元素开一次 minor 版本；`packages/print-common` 属实验性包，接入时注意其版本号与主线不同步。

## 六、若实施：验收面（先记着，不在本轮做）

- 单元模板含中文药名与数字剂量各一，验证「成对内容不被切断」与「最后一行不满」两种边界。
- 三端同源出纸比对：浏览器预览、服务端 PDF、桌面客户端各打一张，用 `npm run parity:cross-end`。
- 双壳一致性：canvas 与 print-common 的工具箱顺序、图标、属性台项、元素类名逐字对齐；样式由 `packages/print-common/scripts/gen-styles.mjs` 同源派生，新元素两侧必须同名类。
- 回归面：`packages/print-core` 的分页与文本排版单测、`designer/utils/__tests__/table-matrix.spec.ts`、若动表格列宽口径则要跑 `services/print-render` 的分页类集成测试。
- 模板夹具：`demo/src/samples/` 加一个处方样例，供 issue 回帖可直接复现。

## 七、本轮留存

- 视觉伴侣屏：`http://localhost:61438/`，内容片段写在 `.superpowers/brainstorm/41539-1792661553/content/flow-list-approaches.html`（该目录已在 `.gitignore` 第 21 行，不入库，服务空闲 4 小时后自退）。本文第 3 节的线框是该屏的文字化留存。
- 浏览器点选记录 `events` 为空——**维护者未在屏上做任何选择**，故第 3、4 节的所有档位一律视为未拍板，推荐意见仅供后续决策参考。
