<?php

namespace Symbiote\Prose;

use SilverStripe\ORM\DataObject;
use SilverStripe\Core\Convert;
use SilverStripe\CMS\Model\SiteTree;
use SilverStripe\Control\Controller;
use SilverStripe\Assets\File;
use SilverStripe\Assets\Folder;
use SilverStripe\Core\Manifest\ModuleResourceLoader;
use SilverStripe\Assets\Image;
use SilverStripe\Control\HTTPRequest;
use SilverStripe\Assets\Upload;
use SilverStripe\Core\ClassInfo;
use SilverStripe\Security\SecurityToken;
use SilverStripe\Core\Injector\Injector;
use SilverStripe\View\Parsers\ShortcodeParser;
use SilverStripe\View\Parsers\HTML4Value;


/**
 * Controller that handles requests for data to manage the tree
 *
 * @author Marcus Nyeholt <marcus@silverstripe.com.au>
 */
class ProseController extends Controller
{

    private static $allowed_actions = array(
        'childnodes' => 'CMS_ACCESS_CMSMain',
        'search' => 'CMS_ACCESS_CMSMain',
        'pastefile' => 'CMS_ACCESS_CMSMain',
        'uploadfile' => 'CMS_ACCESS_CMSMain',
        'rendershortcode'
    );

    /**
     * The raw types to search and filter by. If this is an array,
     * we should load objects of index 0, and filter for the classnames in index 1
     */
    private static $type_map = [
        'page' => SiteTree::class,
        'file' => File::class,
        'image' => [File::class, [Image::class, Folder::class]]
    ];

    protected function searchBaseType($type)
    {
        $rootObjectType = $this->config()->type_map[$type];
        if (is_array($rootObjectType)) {
            return $rootObjectType[0];
        }
        return $rootObjectType;
    }

    protected function searchFilterTypes($type)
    {
        $rootObjectType = $this->config()->type_map[$type];
        if (is_array($rootObjectType)) {
            return $rootObjectType[1];
        }
        return null;
    }

    public function search($request)
    {
        $data = array();

        $searchType = 'page';
        if ($request->param('ID')) {
            $searchType = $request->param('ID');
        }

        $rootObjectType = $this->searchBaseType($searchType);
        $term = $request->getVar('term');

        $type = $rootObjectType;

        $data = array();
        $parents = [];
        $list = null;

        if (!$type || strlen($term) < 1) {
            $list = DataObject::get($rootObjectType);
        } else {
            $list = DataObject::get($rootObjectType);
            if (is_numeric($term)) {
                $list = $list->filter([
                    'ParentID' => $term,
                ]);
            } else {
                $list = $list->filterAny([
                    'Title:PartialMatch' => $term,
                    'Name:PartialMatch' => $term,
                ]);
            }

            $hasParents = isset(singleton($rootObjectType)->hasOne()['Parent']);

            if ($hasParents) {
                $parentIds = $list->column('ParentID');
                if (count($parentIds)) {
                    $base = DataObject::getSchema()->baseDataClass($rootObjectType);
                    $parentObs = $base::get()->filter('ID', $parentIds);
                    $parents = $parentObs->map()->toArray();
                }
            }
        }

        $filterTypes = $this->searchFilterTypes($searchType);

        if ($filterTypes) {
            $allClasses = [];
            foreach ($filterTypes as $filterType) {
                $allTypes = ClassInfo::subclassesFor($filterType);
                $allClasses = array_merge($allClasses, array_values($allTypes));
            }

            $list = $list->filter(['ClassName' => array_values($allClasses)]);
        }

        $data = $this->packageDataList($list, $parents);

        $this->getResponse()->addHeader('Content-Type', 'application/json');
        return Convert::raw2json([
            'results' => $data
        ]);
    }

    protected function packageDataList($list, $parents = [])
    {
        $data = array();
        if ($list) {
            $list = $list->limit(50);
            foreach ($list as $child) {
                if ($child->ID < 0) {
                    continue;
                }

                $nodeData = [
                    'text' => isset($child->MenuTitle) ? $child->MenuTitle : $child->Title,
                    'location' => isset($parents[$child->ParentID]) ? $parents[$child->ParentID] : '',
                    'id' => $child->ID,
                ];

                $thumbs = null;

                $nodeData['data'] = [
                    'link' => $child instanceof File ? $child->getURL() : $child->RelativeLink()
                ];

                // if (!strlen($nodeData['data']['link'])) {
                //     continue;
                // }

                if ($child->ClassName == Image::class) {
                    $thumbs = $this->generateThumbnails($child);
                    $nodeData['icon'] = $thumbs['x128'];
                    if (!$nodeData['icon']) {
                        $nodeData['icon'] = 'resources/symbiote/silverstripe-prose-editor/client/images/page.png';
                    }
                } else if ($child instanceof SiteTree) {
                    // $nodeData['icon'] = ModuleResourceLoader::singleton()->resolvePath('symbiote/silverstripe-frontend-authoring: client/images/page.png');
                    $nodeData['icon'] = 'resources/symbiote/silverstripe-prose-editor/client/images/page.png';
                } else {
                    $nodeData['icon'] = 'resources/symbiote/silverstripe-prose-editor/client/images/folder.png';
                }

                $data[] = $nodeData;
            }
        }

        return $data;
    }

    /**
     * Request nodes from the server
     *
     * TODO - refactor to use the 'packageDataList' method above
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

        $rootObjectType = $this->searchBaseType($searchType);
        if ($request->getVar('search')) {
            return $this->performSearch($request->getVar('search'), $rootObjectType);
        }

        $parentId = (int) $request->getVar('id');
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
                    } else if ($child instanceof SiteTree) {
                        // $nodeData['icon'] = ModuleResourceLoader::singleton()->resolvePath('symbiote/silverstripe-frontend-authoring: client/images/page.png');
                        $nodeData['icon'] = 'resources/symbiote/silverstripe-prose-editor/client/images/page.png';
                    } else {
                        $nodeData['icon'] = 'resources/symbiote/silverstripe-prose-editor/client/images/folder.png';
                    }

                    $nodeData['children'] = $haskids;

                    $nodeData['data'] = [
                        'link' => $child instanceof File ? $child->getURL() : $child->RelativeLink()
                    ];


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
        $by16 = $image->Fit(16, 16);
        $by32 = $image->Fit(32, 32);
        $by64 = $image->Fit(64, 64);
        $by128 = $image->Fit(128, 128);

        $thumbs['x16'] = $by16 ? $by16->Link() : '';
        $thumbs['x32'] = $by32 ? $by32->Link() : '';
        $thumbs['x64'] = $by64 ? $by64->Link() : '';
        $thumbs['x128'] = $by128 ? $by128->Link() : '';
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

    public function uploadfile(HTTPRequest $request)
    {
        if (!SecurityToken::inst()->checkRequest($request)) {
            return $this->owner->httpError(403);
        }


        $response = ['success' => false];

        if (isset($_FILES['imageUpload']) && file_exists($_FILES['imageUpload']['tmp_name'])) {
            $upload = Upload::create();
            $upload->setValidator(Injector::inst()->create(ContentUploadValidator::class));

            $image = Image::create();
            $path = $this->sanitiseFilePath($request->requestVar('path'));
            if (!$path) {
                $path = 'Uploads';
            }

            $upload->loadIntoFile($_FILES['imageUpload'], $image, $path);

            $file = $upload->getFile();
            if ($file && $file->ID) {
                $response['success'] = true;
                $response['url'] = $file->getURL();
                $response['name'] = $file->Title;
                $response['folder_id'] = $file->ParentID;
            }
            if (file_exists($_FILES['imageUpload']['tmp_name'])) {
                @unlink($_FILES['imageUpload']['tmp_name']);
            }
        }

        $this->owner->getResponse()->addHeader('Content-Type', 'application/json');
        return json_encode($response, JSON_PRETTY_PRINT);
    }

    public function pastefile(HTTPRequest $request)
    {
        if (!SecurityToken::inst()->checkRequest($request)) {
            return $this->owner->httpError(403);
        }
        $raw = $request->postVar('rawData');
        $filename = $request->postVar('filename') ?
            $request->postVar('filename') . '.png' : 'upload.png';

        $response = ['success' => true];
        if (substr($raw, 0, strlen('data:image/png;base64,')) === 'data:image/png;base64,') {
            $path = $this->sanitiseFilePath($request->postVar('path'));
            $parts = explode('/', $path);
            if (count($parts) > 5) {
                $path = 'Uploads';
            }

            $base64 = substr($raw, strlen('data:image/png;base64,'));
            $tempFilePath = tempnam(TEMP_FOLDER, 'png');
            file_put_contents($tempFilePath, base64_decode($base64));

            $image = Image::create();

            $tempFile = [
                'error' => '',
                'size' => strlen($raw),
                'name' => $filename,
                'tmp_name' => $tempFilePath
            ];
            $upload = Upload::create();
            $upload->setValidator(Injector::inst()->create(ContentUploadValidator::class));
            $upload->loadIntoFile($tempFile, $image, $path);

            $file = $upload->getFile();
            if ($file && $file->ID) {
                $response['url'] = $file->getURL();
                $response['name'] = $file->Title;
            }
            if (file_exists($tempFilePath)) {
                @unlink($tempFile);
            }
        }
        $this->owner->getResponse()->addHeader('Content-Type', 'application/json');
        return json_encode($response, JSON_PRETTY_PRINT);
    }

    protected function sanitiseFilePath($path)
    {
        $bits = explode('/', $path);

        $valid = array_map(function ($segment) {
            if ($segment == '.' || $segment == '..') {
                return '';
            }

            return substr($segment, 0, 32);
        }, $bits);

        $valid = array_filter($valid, function ($part) {
            return strlen($part) > 0;
        });

        return implode("/", $valid);
    }


    /**
     * Search for a node based on the passed in criteria. The output is a list
     * of nodes that should be opened from the top down
     *
     */
    protected function performSearch($query, $rootObjectType = 'SiteTree')
    {
        $item = null;

        if (preg_match('/\[sitetree_link id=([0-9]+)\]/i', $query, $matches)) {
            $item = DataObject::get_by_id($rootObjectType, $matches[1]);
        } else if (preg_match('/^assets\//', $query)) {
            // search for the file based on its filepath
            $item = DataObject::get_one($rootObjectType, singleton('FEUtils')->dbQuote(array('Filename =' => $query)));
        }

        if ($item && $item->ID) {
            $items = array();
            while ($item->ParentID != 0) {
                array_unshift($items, $rootObjectType . '-' . $item->ID);
                $item = $item->Parent();
            }

            array_unshift($items, $rootObjectType . '-' . $item->ID);
            return implode(',', $items);
        }

        return '';
    }

    public function rendershortcode()
    {
        $item      = $this->owner->getRequest()->getVar('shortcode');
        if ($item) {
            $shortcodeParams = $this->owner->getRequest()->getVar('attrs') ?
                json_decode($this->owner->getRequest()->getVar('attrs'), true) : [];
            $shortcodeStr = $this->shortcodeStr($item, $shortcodeParams);
            // shortcode parser doesn't handle missing width/height attributes well.
            $str = @ShortcodeParser::get_active()->parse($shortcodeStr);
            if ($str && strlen($str)) {
                $str = HTML4Value::create($str)->getContent();
                $str = preg_replace('~>\\s+<~m', '><', $str);
                // replace style="width: 0px;" as caused by embedShortcodeProvider
                $str = str_replace('style="width: 0px;"', '', $str);
            }
            return trim($str);
        }
    }

    protected function shortcodeStr($shortcode, $params)
    {
        $paramStr = $this->attrListToAttrString($params);
        $shortcode = '[' . $shortcode . ']';
        return strlen($paramStr) ? str_replace(']', ',' . $paramStr . ']', $shortcode) : $shortcode;
    }

    /**
     * Convert an array of key => values to shortcode parameters.
     *
     * @param aray $shortcodeParams
     * @return string
     */
    protected function attrListToAttrString($shortcodeParams)
    {
        $params = [];
        if (is_array($shortcodeParams)) {

            foreach ($shortcodeParams as $name => $values) {
                if (strlen($values)) {
                    $params[] = $name . '="' . $values . '"';
                }
            }
        }
        return implode(',', $params);
    }
}
