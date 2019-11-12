<?php

use SilverStripe\View\Parsers\ShortcodeParser;
use Symbiote\Prose\ProseShortcodes;

ShortcodeParser::get('default')->register('inline_placeholder', array(ProseShortcodes::class, 'placeholder'));
ShortcodeParser::get('default')->register('block_placeholder', array(ProseShortcodes::class, 'block_placeholder'));
ShortcodeParser::get()->register('embed', [ProseShortcodes::class, 'embed_shortcode']);
