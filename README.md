# Prose Editor

[![Latest Stable Version](https://poser.pugx.org/symbiote/silverstripe-prose-editor/version.svg)](https://github.com/symbiote/silverstripe-prose-editor/releases)
[![Latest Unstable Version](https://poser.pugx.org/symbiote/silverstripe-prose-editor/v/unstable.svg)](https://packagist.org/packages/symbiote/silverstripe-prose-editor)
[![Total Downloads](https://poser.pugx.org/symbiote/silverstripe-prose-editor/downloads.svg)](https://packagist.org/packages/symbiote/silverstripe-prose-editor)
[![License](https://poser.pugx.org/symbiote/silverstripe-prose-editor/license.svg)](https://github.com/symbiote/silverstripe-prose-editor/blob/master/LICENSE.md)

Provides a wysiwyg editor for HTMLText content fields. 

Combined with the frontend authoring module, provides in-place page editing capability

## Composer Install

```
composer require symbiote/silverstripe-prose-editor:~1.0
```

## Requirements

* SilverStripe 4.1+


## Quick Start

Create and use ProseEditorField where you would otherwise use HtmlEditorField


## Documentation

* Markdown-like shortcuts for formatting and creating lists, eg strike, bold, inline code
* Table editing 
* Image paste and upload, 
* Insert images from the CMS
* Insert page links from the CMS
* Creating new pages using square brackets/round brackets, [{page name}]({url-segment}]. You can leave url-segment empty, and one will be automatically created (requires the frontend-authoring module)

### Shortcodes

Add the following to your _config.php if you'd like some additional shortcodes made available

```
ShortcodeParser::get('default')->register('show_field', array(ProseShortcodes::class, 'show_field_shortcode'));
ShortcodeParser::get('default')->register('listing', array(ProseShortcodes::class, 'listing_content'));
ShortcodeParser::get('default')->register('workflow_tasks', array(ProseShortcodes::class, 'workflow_tasks'));
ShortcodeParser::get('default')->register('random_item', array(ProseShortcodes::class, 'random_item'));
ShortcodeParser::get('default')->register('userform', array(ProseShortcodes::class, 'userform'));
```

* show_field(field, args) : Displays a field from the 'context' object, typically the currently viewed page. 
  * field: The field to display; can be in dotted notation for relationship traversal, ie Team.Title
  * args: Comma separated list of arguments to pass when resolving the value
* listing(page_id, source_id) : Requires the ListingPage module, lists out content
  * page_id: The listing page to render
  * source_id: The source of the listing. Pass in 'me' to refer to the current page
* workflow_tasks: Lists out the current user's workflow tasks
* random_item: Gets a random page from the last 50 edited pages 
* userform(form_id): Display the content of the userform from ID form_id

More:

* [License](LICENSE.md)
* [Contributing](CONTRIBUTING.md)
