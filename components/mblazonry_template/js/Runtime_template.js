/* eslint-disable no-unused-vars */
/*eslint no-underscore-dangle: ["error", { "allow": ["_GUID", "_parentComponentId"] }]*/

(function ($, skuid, window, undefined)
{
    'use strict';

    var $a = skuid.actions;
    var $c = skuid.component;
    var $e = skuid.events;
    var $m = skuid.model;
    var $u = skuid.utils;
    var console = window.console;

    var runtime_template = function (domElement, xmlConfig, component)
    {
        /////////////////////
        // Setting up vars //
        /////////////////////
        var contents, body, conditions,
            model = $m.getModel(xmlConfig.attr("model")),
            context = (component ? component.context : null),
            row = context && context.row;

        !model && !xmlConfig.attr("model") && context && context.model && (model = context.model);
        contents = xmlConfig.children("contents").first();
        contents = contents.length ? contents[0] : xmlConfig[0];
        body = contents.textContent || contents.text;
        conditions = component.createConditionsFromXml(xmlConfig);

        var multiple = xmlConfig.attr("multiple"),
            actions = xmlConfig.children("actions"),
            uniqueId = xmlConfig.attr("uniqueid");

        var eventName = actions.attr("eventname"),
            eventType = actions.attr("event"),
            isClickEvent = (eventType === "click"),
            isCustomEvent = !isClickEvent,
            allowHTML = ("true" === xmlConfig.attr("allowhtml")),
            isHidden = ("true" === xmlConfig.attr("hidden")),
            isMultiRow = (multiple && (multiple === "true"));

        ///////////////////////////
        // Creating the template //
        ///////////////////////////
        var templateComponent = new $u.TemplateComponent(domElement,
        {
            model: model,
            allowHTML: allowHTML,
            templateBody: body,
            isMultiRow: isMultiRow,
            context: context,
            conditions: conditions
        });

        if (component)
        {
            component.unregister = function ()
            {
                $c.Component.prototype.unregister.call(component);
                templateComponent.unregister();
            };
        }

        /////////////////////////////////////
        // Top-level || mblazonry-template //
        /////////////////////////////////////
        var template = domElement;

        template.addClass("mblazonry-template");

        if (allowHTML)
        {
            template.addClass("allowHMTL");
        }

        if (isHidden)
        {
            template.addClass("hidden");
        }

        // only make clickable if we have
        // click enbaled and actions to run.
        if (isClickEvent && actions.children().length)
        {
            eventName = eventType;
            template.addClass("clickable");
        }

        // ################################################################
        // document.ready. event hook
        //
        $(window).load(function ()
        {
            if (isClickEvent)
            {
                $(`#${uniqueId}`).on(eventName, handle);
            }
            else
            {
                $e.subscribe(eventName, handle);
            }
        });

        function handle(event, X)
        {
            // Run action framework actions if any
            if (actions)
            {
                runActions(actions, event);
            }
        }

        /**
         * Takes an XML top-level action node and runs all of its child actions.
         * @param  {Object} actionsNode the XML top-level action node
         */
        function runActions(actionsNode, event)
        {
            if (actionsNode && actionsNode.length)
            {

                var rowID, initiatorId, parentComponentId, componentType,
                    msg = `Event %c${eventType}` + (isCustomEvent ? `:${eventName}` : '') + ` on ${uniqueId}`;

                if (event.target) // implies row context
                {
                    rowID = event.target.textContent.split(' ').slice(-1).pop();

                    if (rowID)
                    {
                        msg += ` at row:${rowID}`;
                    }
                }
                else if (event.definition) // implies component context
                {
                    componentType = event.definition[0].tagName;
                    initiatorId = event._GUID;
                    parentComponentId = event._parentComponentId;

                    if (initiatorId)
                    {
                        msg += ` with componentType:${componentType} and initiatorId:${initiatorId}`;
                    }
                }
                $a.runActionsNode(actionsNode, component, context ||
                {
                    model: model,
                    row: rowID ? model.getRowById(rowID) : null,
                    initiatorId: initiatorId,
                }).then(() =>
                {
                    // console.log(msg + " succeded!", "color:#6fd99f");
                    console.log(msg + " succeded!", "color:#5bd492");
                }, () =>
                {
                    console.log(msg + " errored :(", "color:#6fd99f");
                });
            }
        }
    };
    skuid.componentType.register("mblazonry__template", runtime_template);
    $u.registerPlugin("mblazonry__template",
    {
        init: function (xmlConfig, component)
        {
            return runtime_template(this, xmlConfig, component), this.data("object", this), this;
        }
    });
})(window.skuid.$, window.skuid, window);
