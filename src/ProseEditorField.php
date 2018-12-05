<?php

namespace Symbiote\Prose;

use SilverStripe\Forms\FormField;


class ProseEditorField extends FormField
{
    protected $schemaDataType = FormField::SCHEMA_DATA_TYPE_TEXT;

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