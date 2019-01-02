<?php

namespace Symbiote\Prose;

use SilverStripe\Forms\FormField;
use SilverStripe\View\Requirements;
use SilverStripe\CMS\Model\SiteTree;
use SilverStripe\Assets\File;
use SilverStripe\Core\Manifest\ModuleResourceLoader;
use SilverStripe\ORM\DataObject;
use SilverStripe\Core\Convert;


class ProseEditorField extends FormField
{
    private static $allowed_actions = [
        'childnodes',
    ];

    private static $type_map = [
        'page' => SiteTree::class,
        'file' => File::class,
    ];

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
                'data-tree-url' => '__tree',
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


    /**
     * Request nodes from the server
     *
     * @param SS_HTTPRequest $request
     * @return JSONString
     */
    public function childnodes($request)
    {
        $data = array();

        $searchType = 'page';
        if ($request->param('ID')) {
            $searchType = $request->param('ID');
        }

        $rootObjectType = $this->config()->type_map[$searchType];
        if ($request->getVar('search')) {
            return $this->performSearch($request->getVar('search'), $rootObjectType);
        }

        $parentId = (int)$request->getVar('id');
        if (!$parentId || $parentId == '#') {
            $parentId = 0;
        }

        $selectable = null;

        if ($request->param('OtherID')) {
            $selectable = explode(',', $request->param('OtherID'));
        }

        $type = $rootObjectType;
        $id = $parentId;

        if (!$type || $id < 0) {
            $data = array(0 => array('data' => 'An error has occurred'));
        } else {
            $children = null;
            if ($id === 0) {
                $children = DataObject::get($rootObjectType)->filter('ParentID', 0);
            } else {
                $object = DataObject::get_by_id($type, $id);
                $children = $this->childrenOfNode($object);
            }

            $data = array();
            if ($children && count($children)) {
                foreach ($children as $child) {
                    if ($child->ID < 0) {
                        continue;
                    }

                    $haskids = $child->numChildren() > 0;
                    $nodeData = [
                        'text' => isset($child->MenuTitle) ? $child->MenuTitle : $child->Title,
                        'id' => $child->ID,
                    ];
                    if ($selectable && !in_array($child->ClassName, $selectable)) {
                        $nodeData['clickable'] = false;
                    }

                    $thumbs = null;
                    if ($child->ClassName == Image::class) {
                        $thumbs = $this->generateThumbnails($child);
                        $nodeData['icon'] = $thumbs['x32'];
                    } else if (!$haskids) {
                        // $nodeData['icon'] = ModuleResourceLoader::singleton()->resolvePath('symbiote/silverstripe-frontend-authoring: client/images/page.png');
                        $nodeData['icon'] = 'resources/symbiote/silverstripe-frontend-authoring/client/images/page.png';
                    }

                    $nodeData['children'] = $haskids;

                    $nodeData['data'] = [
                        'link' => $child instanceof File ? $child->getURL() : $child->RelativeLink()
                    ];

                    // $nodeEntry = array(
                    //     'attributes' => array('id' => $child->ClassName . '-' . $child->ID, 'text' => Convert::raw2att($nodeData['text']), 'link' => $child->RelativeLink()),
                    //     'data' => $nodeData,
                    //     'state' => $haskids ? 'closed' : 'open'
                    // );

                    // if ($thumbs) {
                    //     $nodeEntry['thumbs'] = $thumbs;
                    // }

                    $data[] = $nodeData;
                }
            }
        }

        $this->getResponse()->addHeader('Content-Type', 'application/json');
        return Convert::raw2json($data);
    }

    /**
     * Called to generate thumbnails before sending the image data back
     *
     * @param Image $image
     */
    protected function generateThumbnails(Image $image)
    {
        $thumbs = array();
        $thumbs['x16'] = $image->Fit(16, 16)->Link();
        $thumbs['x32'] = $image->Fit(32, 32)->Link();
        $thumbs['x128'] = $image->Fit(128, 128)->Link();
        return $thumbs;
    }

    /**
     * Method to work around bug where Hierarchy.php directly refers to
     * ShowInMenus, which is only available on SiteTree
     *
     * @param DataObject $node
     * @return DataList
     */
    protected function childrenOfNode($node)
    {
        $result = $node->stageChildren(true);
        if (isset($result)) {
            foreach ($result as $child) {
                if (!$child->canView()) {
                    $result->remove($child);
                }
            }
        }

        return $result;
    }
}
