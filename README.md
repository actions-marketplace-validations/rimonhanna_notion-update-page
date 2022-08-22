# Notion Update Page

![on_master](https://github.com/rimonhanna/notion-update-page/actions/workflows/on_master.yml/badge.svg)

GitHub action to update a Notion page property.
## Example Usage

```yml
uses: rimonhanna/notion-page-update@1.0.3
with:
  notion-key: ${{ secrets.NOTION_KEY }}
  notion-page-id: ${{ secrets.NOTION_PAGE_ID }}
  notion-property-name: "Status"
  notion-update-value: "Merged"
  notion-property-type: "rich_text"
  existing-value: "overwrite"
```

- `notion-key`: Notion Integration Secret Key
- `notion-page-id`: Notion Page Id to be updated
- `notion-property-name`: Notion Page property to be updated
- `notion-update-value`: New value for Notion page property
- `notion-property-type` (optional): Type of Notion Page property. Can be `rich_text` or `multi_select`. Defaults to `rich_text`.
- `existing-value` (optional): What to do with existing value in field to be updated. Can be `append` or `overwrite`. Defaults to
  - `overwrite` if `notion-property-type` is `rich_text`
  - `append` if `notion-property-type` is `multi_select`
