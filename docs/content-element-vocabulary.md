# Content element vocabulary / 网页内容元素词典

This document is the source of truth for typography and semantic content roles on Wenbo Ji's core site. It separates three concerns:

- HTML headings describe the document outline.
- `type-*` classes describe visual hierarchy.
- Component classes such as `entry-*` and `collab-*` describe layout and component appearance.

本文档是核心站点排版和内容语义的唯一规范。HTML 标题负责文档结构，`type-*` 类负责视觉层级，组件类只负责布局和组件外观。

## Canonical roles / 标准角色

| ID  | 中文名称     | English name  | Role class            | Semantic element                                    | Desktop / mobile                  | Weight / line height | Tracking / case    |
| --- | ------------ | ------------- | --------------------- | --------------------------------------------------- | --------------------------------- | -------------------- | ------------------ |
| R01 | 页面身份标题 | Page title    | `.type-page-title`    | One `h1` per page                                   | 36px / `clamp(27px, 7.4vw, 32px)` | 700 / 1.15           | Normal / none      |
| R02 | 页面区块标题 | Section title | `.type-section-title` | `h2`                                                | 28px / 23px                       | 700 / 1.18           | Normal / none      |
| R03 | 内容条目标题 | Entry title   | `.type-entry-title`   | `h3`                                                | 20px / 20px                       | 700 / 1.25           | Normal / none      |
| R04 | 内容分组标题 | Group heading | `.type-group-label`   | `h4` inside an entry; `h3` directly below a section | 14px / 14px                       | 700 / 1.35           | 0.1em / uppercase  |
| R05 | 描述正文     | Body          | `.type-body`          | `p`, `li`                                           | 16px / 16px                       | 400 / 1.65           | Normal / none      |
| R06 | 次要说明     | Secondary     | `.type-secondary`     | Authors, collaborators, affiliations                | 14px / 14px                       | 400 / 1.5            | Normal / none      |
| R07 | 元数据       | Metadata      | `.type-meta`          | `time`, venue, date, type, location                 | 13px / 13px                       | 600 / 1.45           | Normal / none      |
| R08 | 图注或注释   | Caption       | `.type-caption`       | `figcaption`, supporting note                       | 13px / 13px                       | 400 / 1.5            | Normal / none      |
| R09 | 分类标签     | Tag           | `.type-tag`           | Research area or category label                     | 14px / 14px                       | 700 / 1.4            | Normal / none      |
| R10 | 状态徽标     | Badge         | `.type-badge`         | Compact state such as `ex` or `now`                 | 10px / 10px                       | 700 / 1.25           | 0.08em / uppercase |
| R11 | 文本控件     | Control       | `.type-control`       | Standalone text link or button                      | 15px / 15px                       | 600 / 1.4            | Normal / none      |

## Formal modifiers / 正式修饰类

- `.type-body--emphasis` keeps the R05 Body size and line height but raises its weight to 700 for a deliberately emphasized sentence.
- `.type-meta--uppercase` keeps the R07 Metadata metrics and applies uppercase transformation to categorical metadata such as venue or experience type.

修饰类只能与对应的基础角色类同时使用。组件类不得自行复制这些字重或大小写规则。

## Hierarchy rules / 层级规则

1. Desktop uses Page title > Section title > Entry title > Group heading = Body by visual size. Mobile uses Page title > Section title > Entry title > Body > Group heading.
2. Description text belongs to its containing Entry title, not to the Group heading that labels a field within that entry. Research Arc descriptions belong to the Section title.
3. A Group heading remains subordinate to its containing Entry title: 16px on desktop and 14px on mobile versus the 20px Entry title.
4. Inline links inherit the typography of their parent. Use `a` for navigation and `button` for actions or state changes.
5. Component styles may change spacing and color. They must not introduce a competing font size, weight, line height, or tracking for an element carrying a `type-*` role.
6. Core pages rendered through `base.njk` follow this contract. Standalone 404, rendering, challenge, and Three.js demo pages may define explicit local systems.

## Standard experience example / 经历卡片标准示例

```html
<section aria-labelledby="experiences">
  <h2 id="experiences" class="section-heading type-section-title">
    Experiences
  </h2>
  <article>
    <h3 class="entry-title type-entry-title">
      Video World Model for Robot Dexterous Manipulation
    </h3>
    <time class="entry-meta type-meta">Apr 2026 - Now</time>

    <h4 class="entry-label type-group-label">Contributions</h4>
    <ul class="entry-contrib type-body">
      <li>Developing a cross-embodiment video generation method…</li>
    </ul>

    <h4 class="collab-heading type-group-label">Mentors</h4>
    <div class="collab-row type-secondary">…</div>
  </article>
</section>
```

When discussing a change, use the canonical names: for example, "reduce the Group heading" or "increase the Entry title." Avoid ambiguous phrases such as "the small title" or "the corresponding title."

今后沟通时直接使用标准名称，例如“缩小 Group heading”或“增大 Entry title”，避免使用“小标题”“对应标题”等无法唯一定位的说法。
