<?php

namespace Symbiote\Prose;

use SilverStripe\Forms\FormField;
use SilverStripe\View\Requirements;


class ProseEditorField extends FormField
{
    protected $schemaDataType = FormField::SCHEMA_DATA_TYPE_TEXT;

    public function __construct($name, $title = null, $value = null)
    {
        parent::__construct($name, $title, $value);
        // include TinyMCE Javascript
        Requirements::css('symbiote/silverstripe-prose-editor: editor/dist/main.css');
        Requirements::javascript('symbiote/silverstripe-prose-editor: editor/dist/main.js');
    }

    /**
     * {@inheritdoc}
     */
    public function getAttributes()
    {
        $attributes = array_merge(
            parent::getAttributes(),
            array(
                'class' => 'ProseEditorField',
                'value' => null,
                'type' => null,
            )
        );

        return $attributes;
    }

    /**
     * Return value with all values encoded in html entities
     *
     * @return string Raw HTML
     */
    public function ValueEntities()
    {
        return htmlentities($this->Value(), ENT_COMPAT, 'UTF-8');
    }
}