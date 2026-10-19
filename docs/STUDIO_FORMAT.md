# 画师混合工作台 · 数据规范

专业混合（Artist Studio）与原有生成器共享画师库，但**个人评分、喜欢 / 排除名单、主辅适用标签、备注和精选组合**使用独立 IndexedDB 数据表持久保存，版本升级不会覆盖旧版历史、收藏和图片缓存。

## 存储与备份

- IndexedDB 数据库：`artist-generator-v1`，Schema 升至 v2，新增 `studioProfiles` 与 `studioPresets`。名称保持不变以便原地升级；数据仅存于当前浏览器及当前域名，**不自动跨设备同步，也不是云存储**。
- 「保存精选组合」同时保存可再次编辑的结构化预设，并将当前字符串加入旧版「我的串」收藏。后续修改不会反向改写已收藏的旧字符串。
- 「导出 JSON」与「批量导出 TXT」只涉及专业混合工作台，不会清空旧版「我的串」。原有历史收藏仍可在「我的串」页面另行 JSON 导出。
- 换浏览器、清理站点数据、重装系统前请主动导出 JSON 备份，并妥善保管。恢复只会合并合法记录，按画师名称 / 预设 ID 与内容去重；不会静默替换已有记录。
- 单次导入文件不超过 2 MB，各类数据至多 1,000 条；导入前先完整校验再在事务中提交，非法记录不进入数据库。导出不上传任何用户内容。

## JSON 全量格式（`artist-generator.studio-data` v1）

```json
{
  "format": "artist-generator.studio-data",
  "version": 1,
  "exportedAt": "2026-10-19T00:00:00.000Z",
  "profiles": [
    {
      "name": "qianben_shan",
      "rating": 9,
      "role": "either",
      "status": "favorite",
      "note": "浅色系清透画风",
      "updatedAt": 1792368000000
    }
  ],
  "presets": [
    {
      "id": "example-preset-001",
      "title": "精致女性肖像",
      "artists": [
        { "name": "qianben_shan", "weight": 1.05, "role": "main", "locked": true },
        { "name": "kurikabacha", "weight": 0.55, "role": "support", "locked": false }
      ],
      "format": "nai",
      "withPrefix": true,
      "precision": 2,
      "createdAt": 1792368000000,
      "updatedAt": 1792368000000
    }
  ]
}
```

约束：`rating` 为 `null` 或 0–10 间步长 0.5；`role` 为 `main/support/either`；`status` 为 `favorite/neutral/blocked`；每套串恰好一位主画师且不得有重复名字；权重在 0–2，精度只能为 1 或 2。

## TXT 批量格式

每行一套可解析的画师串；空行与 `#` 开头的注释行忽略。首位画师视为主画师，其余视为辅助。支持标准权重或 NAI 权重；权重和 `artist:` 前缀可双向解析。示例：

```text
# 一行一个预设，可批量导入
1.05::artist:qianben_shan ::, 0.55::artist:kurikabacha ::
(artist:humi_humi:1.2), (artist:baifeidaiwang:0.7)
```

TXT 专供批量交换名字与权重，不包含个人评分、排除名单、组合标题等额外字段；需要完整备份时请选择 JSON。TXT 导入后自动产生「批量导入 1/2/…」标题，可在工作台重命名。

## 格式和精度

- 默认随机精度为一位小数，设置可以切到两位。转换已有标准 / NAI 串时保留原始数值的精度。
- 启用前缀时 NAI 使用 `1.05::artist:name ::`；标准格式使用 `(artist:name:1.05)`。
- 旧版错误位置 `artist:1.05::name ::` 和 `artist:(name:1.05)` 仍能被二次编辑器识别并转为规范格式。
- 名称末尾数字过滤仅影响随机候选池，不会删除已保存预设或阻止手动添加。
