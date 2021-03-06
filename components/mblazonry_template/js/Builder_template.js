/* eslint-disable no-unused-vars */

(function ($, skuid, undefined)
{
   'use strict';

   var $S = skuid;
   var $b = $S.builder;
   var $bc = $b.core;
   var $u = $S.utils;
   var $xml = $u.makeXMLDoc;

   $b.registerBuilder(new $b.Builder(
   {
      id: "mblazonry__template",
      name: "mB Template",
      icon: "sk-bi-template",
      description: 'A Merge-Field area.<br/><br/>More information: <ul><li><a href="https://community.skuid.com/skuid/topics/template-component-with-action-framework">Original post on the skuid Community</a></li><li><a href="https://github.com/mBlazonry/mBlazonrySupport/tree/master/Components">mB Support Repo - Components</a></li><li><a href="http://help.skuid.com/s/tutorials/m/components/l/102558-template">Template Component Tutorial</a> </li><li><a href="http://help.skuid.com/s/tutorials/m/models-conditions-filters/l/108687-template-fields">Create Template Fields</a> </li><li><a href="http://help.skuid.com/s/tutorials/m/supercharge-your-ui/l/153540-highlighting-critical-data-using-templates-and-custom-components">Highlighting Critical Data using Templates and Custom Components</a></li></ul>',
      isJSCreateable: true, // required so that component can be added to popup, drawer, etc.
      isTransparent: true,
      handleStateEvent: function (a, event, component)
      {
         $bc.handleModelRemove(a, event,
         {
            component: component
         });
         $bc.handleModelIdChange(a, event);
      },
      propertiesRenderer: function (propertiesObj, component)
      {
         propertiesObj.setTitle("mB Template Properties");
         var state = component.state,
            eventType = state.children.length && state.children("actions").attr("event"),
            isCustomEventType = eventType && ("custom" === eventType),
            isHidden = ("true" == state.attr("hidden")),
            properties = [];

         var basicProps = [
         {
            id: "model",
            type: "model",
            label: "Model",
            required: false,
            onChange: function ()
            {
               if (component.updateAutoCreatedEditorCondition)
               {
                  component.updateAutoCreatedEditorCondition();
               }
               component.save().rebuildProps().refresh();
            }
         },
         {
            id: "contents",
            type: "template",
            label: "Template",
            location: "node",
            helptext: "The text or HTML to display inside the template. Can contain global Merge-Fields, e.g. {{$Model.Contact.data.0.First_Name__c}}, as well as row/model merge fields (e.g. {{Name}}, {{CreatedDate}}) if you have selected a Model. Row merge fields can be easily added using the Merge-Field Picker on the right.",
            onChange: function ()
            {
               component.refreshText();
            }
         },
         {
            id: "allowhtml",
            type: "boolean",
            label: "Allow HTML",
            defaultValue: false,
            onChange: function ()
            {
               component.save().refresh();
            }
         },
         {}];

         if (state.attr("model"))
         {
            basicProps.push(
            {
               id: "multiple",
               type: "boolean",
               label: "Do not run template on each row",
               defaultValue: false,
               helptext: "Normally, row-based template-rendering logic will be applied, so that the specified template will be run for all data rows in the selected Model. If this property is checked, however, the template will only be run once, in a Model context."
            });
         }

         var actionsTreeRoot = {
            customNodeId: "actions",
            label: `Actions (${eventType}):`,
            linkedComponent: component,
            actionsIndent: 1,
            props: [
            {
               type: "helptext",
               html: "Actions created on the left will be triggered by this event:"
            },
            {
               id: "event",
               type: "picklist",
               label: "Event Type",
               defaultValue: "multi",
               picklistEntries: [
               {
                  label: "onClick",
                  value: "click"
               },
               {
                  label: "Custom",
                  value: "custom"
               }],
               onChange: function (e)
               {
                  if ("click" === e)
                  {
                     state.children("actions").removeAttr("eventname");
                  }
                  else if ("custom" === e)
                  {
                     // state.children("actions").attr("eventname", "custom");
                  }
                  component.save().refresh().rebuildProps();
               }
            }]
         };

         if (isCustomEventType)
         {
            actionsTreeRoot.props.push(
            {
               type: "helptext",
               html: "The mouse pointer will no longer show this template as a link. <br>Also, the custom Event Name set here can be fired by Action Framework elsewhere on a page using the \'Publish Event\' Action Type."
            },
            {
               id: "eventname",
               type: "string",
               label: "Event Name",
               isVisible: true,
               placeholder: "yourpackage.eventname",
               onChange: function (src)
               {
                  component.save().refresh().rebuildProps();
               }
            });
         }
         else if (isHidden)
         {
            actionsTreeRoot.props.push(
            {
               type: "helptext",
               html: "⚠ Template is set to \"Hidden\"! Users won't be able to trigger click event!"
            });
         }

         var actionsTree = [$bc.getActionsTree(actionsTreeRoot)];

         var avdancedProps = [
            $bc.coreProps.uniqueIdProp(
            {
               component: component
            }),
            $b.cssClassProp,
            {
               id: "hidden",
               type: "boolean",
               label: "Hidden template",
               defaultValue: false,
               helptext: "The template will have \"display: none;\" set.",
               onChange: function ()
               {
                  component.save().refresh().rebuildProps();
               }
            }
         ];

         // Properties
         properties.push(
            {
               name: 'Basic',
               props: basicProps.concat(avdancedProps)
            },
            {
               name: "Actions",
               tree: actionsTree
            },
            $bc.getRenderingCategory(
            {
               component: component,
               model: null,
               propViewer: propertiesObj
            })
         );

         if (state.attr("model"))
         {
            properties.push($bc.getContextCategory(
            {
               propViewer: propertiesObj,
               state: state,
               modelprop: "model"
            }));
         }

         propertiesObj.applyPropsWithCategories(properties, state);
         $('.nx-pagebuilder-property-item:has(> .nx-field:empty)').hide();
      },
      componentRenderer: function (component)
      {
         component.setTitle(component.builder.name);
         // Create some shortcut variables
         var state = component.state,
            template = component.body,
            allowHTML = ("true" === state.attr("allowhtml")),
            contents = state.children("contents").first();

         // Fresh component!
         if (!contents.length)
         {
            contents = $xml("<contents/>");

            var text = state.text();
            if (text)
            {
               contents.text(text);
            }
            state.empty().append(contents);

            component.save();
         }
         component.element.css(
         {
            display: "inline-block",
            "vertical-align": "top",
            margin: "8px",
         });

         template.addClass("mblazonry-template");

         function refreshText()
         {
            var text = contents.text();
            if (allowHTML)
            {
               template.addClass("allowHTML");

               var e = $("<div>").html(text);
               $("iframe", e).replaceWith($('<div class="sk-iframe-placeholder">'));
               $("script", e).replaceWith($('<div class="sk-script-placeholder">'));
               $("style", e).replaceWith($('<div class="sk-style-placeholder">'));

               // replace what's in the template
               template.empty().append(e);
            }
            else
            {
               //get the contents and convert newlines to <br> tags
               template.html($u.nl2br($("<div>").text(text).html()));
            }
         }

         component.refreshText = refreshText;
         component.refreshText();

         $(component.element).on("click", reJiggerVerticalDropzone);
         $(document).one('ready', function ()
         {
            setTimeout(reJiggerVerticalDropzone, 444);
         });
      },

      defaultStateGenerator: function ()
      {
         /*jshint -W030 */

         var templateXML = $xml('<mblazonry__template/>');
         templateXML.attr(
         {
            multiple: false,
            cssclass: "",
            uniqueid: "",
         });

         templateXML.append($xml("<contents/>"));

         var actions = $xml("<actions/>");

         actions.attr(
         {
            event: 'click'
         });
         templateXML.append(actions);

         setTimeout(reJiggerVerticalDropzone, 2444);

         return templateXML;
      }
   }));

   function reJiggerVerticalDropzone()
   {
      var templates = $('.nx-dropzone.ui-droppable + .nx-pagebuilder-component:has(> .mblazonry-template)');
      var dropzones = $('.nx-pagebuilder-component:has(> .mblazonry-template) ~ .nx-dropzone.ui-droppable');

      if (templates.length > 1)
      {
         for (var i = templates.length - 1; i >= 0; i--)
         {
            $(dropzones[i]).css(
            {
               // height: ($(templates[i]).height() - 24) + "px",
               height: ($(templates[i]).height()) + "px",
               width: "8px",
               display: "inline-block",
               "vertical-align": "top",
               "margin-top": "8px"
            });
         }
      }
   }

})(window.skuid.$, window.skuid);
