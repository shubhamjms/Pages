## Content component rulebook

Contributors do not need to write HTML. Use the rich-text controls or the optional shortcut, and CodeFox will render the corresponding accessible component.

| Content item | What the contributor provides | Rich editor or shortcut | Rendered HTML result |
| --- | --- | --- | --- |
| Article title | A clear article title | Title field | `<h1>` |
| Article subtitle | One concise reader outcome | Subtitle field | Introductory text below `<h1>` |
| Paragraph | Free-form body text | Type or paste text | `<p>` |
| Main section | A major body section | Heading control or `## Heading` | `<h2>` |
| Supporting section | Detail inside a main section | `### Subheading` | `<h3>` |
| Strong emphasis | Important phrase | Bold control | `<strong>` |
| Supporting emphasis | Lighter emphasis | Italic control | `<em>` |
| Link | Descriptive linked text | Link control | `<a>` |
| Bulleted list | Unordered points | Bullets control | `<ul>` and `<li>` |
| Numbered list | Ordered steps | Numbered control | `<ol>` and `<li>` |
| Note | Helpful supporting context | Note control or `##note Text` | `<aside data-type="note">` |
| Warning | Risk, limitation, or prerequisite | Warning control or `##warning Text` | `<aside data-type="warning">` |
| Tip | Practical recommendation | Tip control or `##tip Text` | `<aside data-type="tip">` |
| Image | Image, alternative text, and credit | Optional Images field | `<figure>` and `<img>` |
| Video | HTTPS YouTube or Vimeo URL and title | Optional Videos field or `##video URL | Title` | Responsive `<iframe>` |
| Code | Command, configuration, or source code | Attach or paste with language details | `<pre>` and `<code>` |
| Table | Rows and column headings | Paste a structured table | `<table>` |

### Body rules

- Title and subtitle are maintained separately from the body.
- The body is free-form and has no required section sequence.
- Images and videos are optional.
- Level-two headings appear in the article contents rail.
- Raw HTML from submissions is not published directly.
- All external media must use HTTPS.

