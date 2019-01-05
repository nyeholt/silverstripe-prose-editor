<?php

namespace Symbiote\Prose;

use \Page;

use SilverStripe\ORM\DataObject;
use Symbiote\ListingPage\ListingPage;
use SilverStripe\Control\Controller;
use Symbiote\AdvancedWorkflow\DataObjects\WorkflowInstance;
use SilverStripe\Security\Member;
use SilverStripe\ORM\ArrayList;
use SilverStripe\Core\Convert;
use Symbiote\ListingPage\ListingTemplate;
use SilverStripe\View\SSViewer;
use SilverStripe\CMS\Controllers\ContentController;


class ProseShortcodes
{
    public static function placeholder($arguments, $content = null, $parser = null)
    {
        return '<span style="inline-block; min-width: 100px; padding: 0.1rem; background-color: #ececec;">Placeholder</span>';
    }

    public static function block_placeholder($arguments, $content = null, $parser = null)
    {
        return '<div style="inline-block; min-width: 100px; min-height: 2rem; padding: 0.5rem; background-color: #ececec;">Placeholder</div>';
    }

    public static function childlist_handler($arguments, $content = null, $parser = null)
    {
        $page = self::shortcode_object($arguments);
        if ($page) {
            return $page->renderWith('ListingPage_ChildListing');
        }
    }
    public static function show_field_shortcode($arguments, $content = null, $parser = null)
    {
        $page = self::shortcode_object($arguments);
        if (!$page) {
            return '';
        }
        $field = isset($arguments['field']) ? $arguments['field'] : 'Title';
        $extraArgs = isset($arguments['args']) ? explode(',', $arguments['args']) : [];
        return self::field_value($page, $field, $extraArgs);
    }
    private static function field_value($object, $field, $extraArgs)
    {
        $bits = explode('.', $field);
        $nextField = array_shift($bits);
        if (count($bits) === 0) {
            if (!($object instanceof DataObject) && method_exists($object, $nextField)) {
                return call_user_func_array(array($object, $nextField), $extraArgs);
            }
            return $object->$nextField; //getField($nextField);;
        }
        $nextObject = $object->dbObject($nextField);
        return self::field_value($nextObject, implode('.', $bits), $extraArgs);
    }
    private static function shortcode_object($arguments)
    {
        $page = null;
        $class = isset($arguments['class']) ? $arguments['class'] : 'Page';
        if (isset($arguments['id'])) {
            $page = $class::get()->byID($arguments['id']);
        }
        if (!$page) {
            $controller = Controller::has_curr() ? Controller::curr() : null;
            $page = $controller instanceof ContentController ? $controller->data() : null;
        }
        return $page && $page->hasMethod('canView') ? ($page->canView() ? $page : null) : $page;
    }

    public static function listing_content($arguments, $content = null, $parser = null)
    {
        $pageId = isset($arguments['page_id']) ? $arguments['page_id'] : 0;
        $sourceId = isset($arguments['source_id']) ? $arguments['source_id'] : 0;
        if (!$pageId) {
            return "Please set a page_id attribute of the listing page to embed, and optionally a source_id for it to list from ('me' is valid here)";
        }
        $listingPage = ListingPage::get()->byId($pageId);
        if ($listingPage) {
            if ($sourceId) {
                if ($sourceId === 'me' && Controller::has_curr()) {
                    $ctrl = Controller::curr();
                    if ($ctrl instanceof ContentController) {
                        $sourceId = $ctrl->data()->ID;
                    }
                }
                $listingPage->ListingSourceID = (int)$sourceId;
            }
            return $listingPage->Content();
        }
    }
    public static function workflow_tasks($arguments, $content = null, $parser = null)
    {
        $currentUser = Member::currentUser();
        if (!$currentUser) {
            return '';
        }
        $groups = $currentUser->Groups()->column();
        $groupInstances = WorkflowInstance::get()->filter([
            'Groups.ID' => $groups,
            'WorkflowStatus:not' => 'Complete',
        ])->toArray();
        $userInstances = WorkflowInstance::get()->filter([
            'Users.ID' => $currentUser->ID,
            'WorkflowStatus:not' => 'Complete',
        ])->toArray();
        $instances = ArrayList::create(array_merge($groupInstances, $userInstances));
        if (isset($arguments['template'])) {
            return self::process_shortcode_template($arguments['template'], $instances);
        }
        $map = $instances->map();
        $items = [];
        foreach ($instances as $item) {
            $target = $item->getTarget();
            if ($target instanceof CMSPreviewable) {
                $result['CMSLink'] = $target->CMSEditLink();
            }
            $link = $target && $target instanceof CMSPreviewable ? $target->CMSEditLink() :
                "admin/workflows/WorkflowDefinition";
            $items[] = '<li><a href="' . $link . '">' . Convert::raw2xml($item->Title) . '</a></li>';
        }
        return '<ul>' . implode($items) . '</ul>';
    }
    public static function process_shortcode_template($templateId, $items)
    {
        if ($templateId) {
            $listing = ListingTemplate::get()->filter('Title', $templateId)->first();
            if ($listing) {
                $item = ArrayData::create(array('Items' => $items));
                $view = SSViewer::fromString($listing->ItemTemplate);
                return $view->process($item);
            }
        }
    }
    public static function random_item($arguments, $content = null, $parser = null)
    {
        $items = Page::get()->sort('LastEdited DESC')->limit(50)->column();
        $key = array_rand($items);
        $page = Page::get()->byID($items[$key]);
        return $page->renderWith('RandomItem');
    }
    public static function userform($arguments, $content = null, $parser = null)
    {
        $formId = isset($arguments['form_id']) ? $arguments['form_id'] : null;
        if (!$formId) {
            return "Please set form_id";
        }
        $form = UserDefinedForm::get()->byID($formId);
        if (!$form) {
            return "Form $formId not found";
        }
        $controller = ModelAsController::controller_for($form);
        $controller->init();
        $form = $controller->Form();
        return $form ? $form->forTemplate() : 'Form not configured';
    }

}
