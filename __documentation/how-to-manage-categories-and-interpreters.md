# How to manage categories and interpreters

Categories and interpreters are managed in the sidebar. A song has at most one category and any number of interpreters.

## Add an entry

- In the sidebar, choose the **Add category** / **Add interpreter** button of the active tab, or
- in the song editor, type a new name in the category or interpreters field and choose the create option. The entry is created together with the song, in one transaction.

Names must not be empty and are limited to 200 characters. They are unique regardless of upper and lower case, so `Folk` and `folk` count as the same name.

## Rename an entry

1. Select the tab (**Categories** or **Interpreters**).
2. Select the entry and choose **Rename selected category** / **Rename selected interpreter** (button tooltips). Enter the new name.

The new name must not collide with another entry (case-insensitive).

## Delete an entry

1. Select the entry and choose **Delete selected category** / **Delete selected interpreter**.
2. Confirm the prompt.

What happens to the songs:

| Deleted item | Effect on songs |
|---|---|
| Category | The songs are kept and move to **(No category)**. |
| Interpreter | The songs are kept. Only the link to the interpreter is removed. |

Songs themselves are never deleted by removing a category or an interpreter.

## Find songs without a category or interpreter

Each tab contains a virtual entry: **(No category)** or **(No interpreter)**. Select it to list the songs that have none. The virtual entries cannot be renamed or deleted.

## See also

- [Data model and limits](reference-data-model-and-limits.md)
- [User interface and keyboard shortcuts](reference-ui-and-shortcuts.md)
