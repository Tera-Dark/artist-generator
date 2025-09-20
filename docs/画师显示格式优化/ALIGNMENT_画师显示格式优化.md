# 画师显示格式优化任务对齐文档

## 项目上下文分析

### 现有项目架构
- **技术栈**: Vue 3 + TypeScript + Vite + Tailwind CSS
- **状态管理**: Pinia Store (generator.ts)
- **数据存储**: JSON文件 (`public/data/`)
- **主要组件**: SimpleTest.vue (主要功能), PresetGrid.vue (预设选择)

### 现有数据格式
**旧格式** (`artists.json`):
```json
{
  "artists": ["artist1", "artist2", "artist3"]
}
```

**新格式** (`danbooru_artists_test_20250920_165108_merged.json`):
```json
[
  {
    "name": "dairi",
    "other_names": ["dairi155", "dairi_(sogebugonbuto)", "はるか", "ダイリ"],
    "post_count": 17662
  }
]
```

### 现有功能分析
1. **画师加载**: 通过 `loadArtists()` 从 `artists.json` 加载简单字符串数组
2. **画师搜索**: 基于简单字符串匹配 (`artist.toLowerCase().includes(searchQuery)`)
3. **画师显示**: 在模态框中显示画师名称列表，支持分页
4. **生成逻辑**: 随机选择画师名称并添加权重

## 原始需求分析

用户要求:
1. **学习新数据格式**: 包含 `name`, `other_names`, `post_count` 的对象结构
2. **显示格式**: `name - other names - postcount` 的格式
3. **搜索增强**: 支持根据 `other_names` 进行搜索

## 需求理解确认

### 功能需求
1. **数据适配**: 将现有系统从字符串数组适配到新的对象结构
2. **显示优化**: 画师列表显示格式为 "主名称 - 别名1,别名2 - 作品数量"
3. **搜索增强**: 搜索功能需要同时匹配主名称和所有别名
4. **向后兼容**: 保持现有生成逻辑的兼容性

### 技术约束
- 保持现有Vue组件结构
- 保持Pinia store接口兼容性
- 保持现有UI/UX体验
- 数据文件路径需要更新

### 边界确认
- **包含**: 数据结构适配、显示格式、搜索逻辑
- **不包含**: 数据文件生成、后端API、用户偏好存储

## 疑问澄清

### 已识别的技术决策点
1. **数据文件路径**: 是否使用新文件名还是重命名为原文件名？
2. **显示格式细节**: other_names过多时是否需要截断？
3. **搜索优先级**: 主名称匹配是否应该优先于别名匹配？
4. **向后兼容**: 生成结果中是否使用主名称还是匹配到的名称？

### 需要确认的问题
1. 新数据文件是否应该替换原有的 `artists.json`？
2. 搜索结果排序：是否按 post_count 排序？
3. 显示格式中，如果 other_names 很长，是否需要省略显示？
4. 在生成结果中，是否总是使用主名称（name字段）？
