/**
 * Runtime-side execution of a component
 * @function
 * @inner
 * @name 'Component_runtime'
 * @param  {object} $ - The jQuery selector
 * @param  {object} skuid - a reference to the $skuid framework
 * @param  {object} window - A reference to the window object
 */


(function ($, skuid, window, undefined)
{
	/**
	 * @namespace skuid
	 */
	/* jshint -W098 */ // x is unused.
	/* jshint -W030 */ // useless and unnecessary code.
	/* jshint -W004 */ // x is already defined.

	"use strict";

	//var $j = $.noConflict();
	var $a = skuid.actions;
	var $e = skuid.events;
	var $t = skuid.time;
	var $m = skuid.model;
	var $p = skuid.page;

	/**
	 * @author aklef
	 * @function
	 * @example See {@link http://help.skuidify.com/m/11720/l/205435?data-resolve-url=true&data-manual-id=11720|skuid.component.Component}
	 * @name 'Runtime_timer'
	 * @namespace Runtime_timer
	 * @param  {'jQuery-wrapped DOM element'} element
	 *                             The root/parent element for the new Component.
	 *                             (This element may or may not
	 *                             	be attached to the DOM.)
	 * @param  {'jQuery-wrapped JS XMLDoc'} xmlDefinition
	 *                            The XML tree this component has.
	 * @param  {skuid.component.Component} component
	 *         A Component instance for your typeDefinition function to interact with.
	 */
	function Runtime_timer(element, xmlDefinition, component)
	{
		/////////////////////////////////
		// Obtain component properties //
		/////////////////////////////////
		var counterStartLabel = xmlDefinition.attr("counterStartLabel"),
			counterStopLabel = xmlDefinition.attr("counterStopLabel"),
			recColor = xmlDefinition.attr("recColor"),
			pollInterval = xmlDefinition.attr("pollInterval"),
			timerIcon = xmlDefinition.attr("timerIcon"),
			actions = xmlDefinition.children("actions"), // useless, only for debugging.
			onStartActions = xmlDefinition.children("onstartactions"),
			onDoneActions = xmlDefinition.children("ondoneactions");

		var userModel = $m.getModel(xmlDefinition.attr("model")),
			user = userModel && userModel.getFirstRow(), // this is our current User record
			user_Name = user && userModel.getFieldValue(user, 'Name');

		var startTimeDestField = noStache(xmlDefinition.attr("startTimeDestField")),
			startTimeTempField = noStache(xmlDefinition.attr("startTimeTempField")),
			endTimeDestination = noStache(xmlDefinition.attr("endTimeDestination")),
			timerNotesDestination = noStache(xmlDefinition.attr("timerNotes")),
			pendingActionsDest = noStache(xmlDefinition.attr("pendingTimerActions")),
			timer_Started_Event = xmlDefinition.attr("onTimerStartedEvent"),
			timer_Done_Event = xmlDefinition.attr("onTimerDoneEvent");

		var startTime = user && userModel.getFieldValue(user, startTimeDestField),
			endTime = user && userModel.getFieldValue(user, endTimeDestination),
			pendingActions = user && userModel.getFieldValue(user, pendingActionsDest);

		//////////////////////////////////
		// Top-level || mblazonry-timer //
		//////////////////////////////////
		// timeout interval for server polling, in ms
		const TIMEOUT_INTERVAL = 12 * 60 * 1000;
		let SESSION_TIMEDOUT = false;
		var timer = element,
			timeout, queriedStartTime;

		timer.addClass("mblazonry-timer");

		/////////////////////////////////////////////
		// Time section || mblazonry-timer-counter //
		/////////////////////////////////////////////
		var settings = {
			initial: '00:00:00',
			direction: 'up',
			format: '23:59:59'
		};
		var counter = $('<span id="counter">').addClass('counter counter-analog3');
		counter.addClass("mblazonry-timer-counter");
		timer.append(counter);

		//////////////////////////////////////////////
		// Button section || mblazonry-timer-button //
		//////////////////////////////////////////////
		var button = $("<div>").addClass("mblazonry-timer-button");
		button.text(counterStartLabel).skooButton(
		{
			icon: timerIcon
		});
		timer.append(button);

		{ // DEBUG
			var info = $("<div>").addClass("mblazonry-timer-debug"),
				d1 = $("<td>").append("<h2>Debug info:</h2>");
			d1.append(
				"<ul> " +
				"<li> userId: \'" + noStache(xmlDefinition.attr("userId")) + "\'</li>" +
				"<li> user_name: \'" + user_Name + "\'</li>" +
				"<li> userModel: \'" + (userModel ? "true" : "false") + "\'</li>" +
				"<li> Start_Time: \'" + startTime + "\'</li>" +
				"<li> End_Time: \'" + endTime + "\'</li>" +
				"<li> Pending_Actions: \'" + pendingActions + "\'</li>" +
				"<li> start_time_temp_field: \'" + startTimeTempField + "\'</li>" +
				"<li> start_time_dest_field: \'" + startTimeDestField + "\'</li>" +
				"<li> end_time_dest_field: \'" + endTimeDestination + "\'</li>" +
				"<li> timer_Started_Event: \'" + timer_Started_Event + "\'</li>" +
				"<li> timer_Done_Event: \'" + timer_Done_Event + "\'</li>" +
				"</ul>"
			);
			var d2 = $("<td>").append("<h3>Actions:</h3>");
			d2.append("<ul> " +
				'<li> actions: \'' + (actions ? "true" : "false") + '\',</li>' +
				'<li> onStartActions: \'' + (onStartActions ? "true" : "false") + '\',</li>' +
				'<li> onDoneActions: \'' + (onDoneActions ? "true" : "false") + '\'</li>' +
				"</ul>");

			var d3 = $("<td>").append("<h3>Advanced/UI:</h3>");
			d3.append("<ul> " +
				'<li> counterStartLabel: ' + (counterStartLabel ? "\'" + counterStartLabel + '\'' : "false") + ',</li>' +
				'<li> counterStopLabel: ' + (counterStopLabel ? "\'" + counterStopLabel + '\'' : "false") + ',</li>' +
				'<li> recColor: ' + (recColor ? "true: \'" + recColor + '\'' : "false") + ',</li>' +
				'<li> pollInterval: ' + (pollInterval ? "true: " + pollInterval + ' seconds' : "false") + ',</li>' +
				'<li> timerIcon: ' + (timerIcon ? "true: \'" + timerIcon + '\'' : "false") + ',</li>' +
				'<li> jQuery verison \'' + $.fn.jquery + '\'</li>' +
				"</ul>");

			var debugTable = $('<table style="width:50%">');
			debugTable.append(d1).append(d2).append(d3);

			info.append(debugTable);
		}
		// ################################################################
		// PageLoad hook - the document.ready event

		$(document).ready(function ()
		{
			/////////////////////
			// PageLoad Events //
			/////////////////////

			//$('.mblazonry-timer').on(timer_Started_Event, timerStartedEventFired);
			$e.subscribe(timer_Started_Event, timerStartedEventFired);

			//$('.mblazonry-timer').on(timer_Done_Event, timerDoneEventFired);
			$e.subscribe(timer_Done_Event, timerDoneEventFired);

			$e.subscribe('models.saved', handleModelSavedOutsideOfPending);

			// Attach a function to the click event
			$('.mblazonry-timer-button').on(
				/**
				 * This event is unique. If a running task is detected there will be no click.
				 * The current user must be on the page and click willingly to start the timer.
				 */
				'click', handleTimerClick);

			// Atatch a function to the timer done event
			// $('.counter').on('counterStop', function ()
			// {
			// 	var snip = skuid.snippet.getSnippet('mblazonryTimerDone');
			// 	snip("Test_of_params");
			// });

			// for Debug Page only
			if ($p.name.match(/Timer_Debug_Page/i) && $('.mblazonry-timer-debug').length === 0)
			{
				// Append useful debug info to body
				$('.nx-page-region').append(info);
			}

			/////////////////////
			// PageLoad Checks //
			/////////////////////

			// There's a task running
			if (endTime && startTime)
			{
				$(".mblazonry-timer-button .ui-button-text").text(counterStopLabel);

				startCounterPending();
				restartCounter();

				if (onDoneActions)
				{
					runActions(onDoneActions);
				}
			}
			else if (startTime)
			{
				settings.initial = parseDateForCounter(elapsedInMilis(startTime));
				$(".mblazonry-timer").addClass("recording");
				startCounter();
			}
			else if (pendingActions)
			{
				handleTimerClick();
			}
			else if (timeout != "0")
			{
				pollTimer();
			}

			////////////////////////////////
			// Handle timer State Changes //
			////////////////////////////////

			/**
			 * Toggles the logical state of this timer.
			 * Should never be done directly.
			 * Should only run action framework.
			 */
			function handleTimerClick()
			{
				if (!startTimeIsValid())
				{
					handleChangedStartTime();
					return;
				}

				var isRecording = $(".mblazonry-timer").hasClass("recording");
				var isPending = $(".mblazonry-timer").hasClass("pending");

				// Clean slate. Continue
				if (!isRecording)
				{
					if (!isPending)
					{
						startPending();
					}
					else
					{
						// error?
					}
				}
				else if (!isPending)
				{
					timerStopPending();
				}
			}
		}); // End of (document).ready

		//////////////////////
		// UI state Changes //
		//////////////////////
		// Start Section

		function startPending()
		{
			startCounterPending();
			pendingActions = true;
			userModel.updateRow(user, pendingActionsDest, true);

			$.when(userModel.save()).then(function ()
			{
				// Update UI-only field after the save so it doesn't get nerfed.
				if (startTimeTempField)
				{
					var tempStartTime = $t.getSFDateTime(new Date());
					userModel.updateRow(user, startTimeTempField, tempStartTime);
				}

				// Run action framework actions if any
				if (onStartActions)
				{
					runActions(onStartActions);
				}
			});
		}

		function timerStarted()
		{
			if (!startTimeIsValid())
			{
				handleChangedStartTime();
				return;
			}

			var newStartTime;

			if (startTimeTempField)
			{
				//newStartTime = userModel.getFieldValue(user, startTimeTempField); // not consistent
				newStartTime = userModel.data[0][startTimeTempField];
				newStartTime = jsDateTimeRemoveMilis(newStartTime);
				settings.initial = parseDateForCounter(elapsedInMilis(newStartTime));
				userModel.updateRow(user, startTimeTempField, null);
			}
			else
			{
				newStartTime = jsDateTimeRemoveMilis($t.getSFDateTime(new Date()));
				settings.initial = '00:00:00';
			}
			// Cleanup
			userModel.updateRow(user, startTimeDestField, newStartTime);
			userModel.updateRow(user, pendingActionsDest, false);
			startTime = newStartTime;
			endTime = null;

			$.when(userModel.save()).done(function ()
			{
				pendingActions = false;
				startCounter();
				// Start polling for updates
				pollTimer();
			});
		}

		//////////////////
		// Stop Section //
		//////////////////

		function timerStopPending()
		{
			stopPending();
			pendingActions = true;
			var stoptime = $t.getSFDateTime(new Date());
			userModel.updateRow(user, endTimeDestination, stoptime);
			userModel.updateRow(user, pendingActionsDest, true);

			$.when(userModel.save()).then(function ()
			{
				if (onDoneActions)
				{
					$.when(runActions(onDoneActions)).then(userModel.updateData());
				}
				else
				{
					userModel.updateData();
				}
			});
		}

		function timerDone()
		{
			// Cleanup
			startTime = null;
			endTime = null;
			stopCounter();
			userModel.updateRow(user, pendingActionsDest, false);
			userModel.updateRow(user, startTimeDestField, null);
			userModel.updateRow(user, endTimeDestination, null);
			userModel.updateRow(user, timerNotesDestination, null);

			$.when(userModel.save()).then(function ()
			{
				pendingActions = false;
				pollTimer(1);
			});
		}

		///////////////////
		// Event section //
		///////////////////

		function timerStartedEventFired()
		{
			if (!startTimeIsValid())
			{
				handleChangedStartTime();
				return;
			}
			window.console.log("Event detected: Timer started!");
			timerStarted();
		}

		function timerDoneEventFired()
		{
			window.console.log("Event detected: Timer done!");
			timerDone();
		}

		/**
		 * Handles userModel saves outside of actionPending contexts.
		 * @function
		 * @memberOf skuid.componentType.Runtime_timer
		 * @param  {Event} saveResult The result of the save operation.
		 */
		function handleModelSavedOutsideOfPending(saveResult)
		{
			if (!pendingActions && (userModel.id in saveResult.models) && (saveResult.totalsuccess))
			{
				window.console.log("Event detected: " + userModel.id + " model saved!");

				userModel.updateData();
				user = userModel.getFirstRow();
				var changedStartTime = userModel.getFieldValue(user, startTimeDestField);

				if (changedStartTime && changedStartTime !== startTime)
				{
					startTime = changedStartTime;
					restartCounter();
				}
				else if (!changedStartTime) // it was deleted
				{
					stopCounter();
					startTime = changedStartTime;
				}

				var newEndTime = userModel.getFieldValue(user, endTimeDestination);
				if (newEndTime && newEndTime !== endTime)
				{
					endTime = newEndTime;
					// do something?
				}
				else if (!newEndTime)
				{
					endTime = newEndTime;
				}

				var changedPendingActions = userModel.getFieldValue(user, pendingActionsDest);
				if (changedPendingActions !== pendingActions)
				{
					pendingActions = changedPendingActions;
				}
			}
		}

		/////////////
		// Counter //
		/////////////

		function startCounterPending()
		{
			$(".mblazonry-timer").addClass("pending");
			$(".mblazonry-timer").addClass("recording");

			// Initialize the counter
			$('.mblazonry-timer-counter').counter('init');
		}

		function startCounter()
		{
			$(".mblazonry-timer").removeClass("pending");
			$(".mblazonry-timer-button .ui-button-text").text(counterStopLabel);
			$('.mblazonry-timer-counter').counter(settings);
		}

		function stopPending()
		{
			$('.mblazonry-timer-counter').counter('stop');
		}

		function stopCounter()
		{
			//stopPending();
			resetCounter();
			$(".mblazonry-timer").removeClass("pending");
			$(".mblazonry-timer").removeClass("recording");
			$(".mblazonry-timer-button .ui-button-text").text(counterStartLabel);
		}

		function restartCounter()
		{
			if (startTime)
			{
				settings.initial = parseDateForCounter(elapsedInMilis(startTime));
			}
			else
			{
				settings.initial = '00:00:00';
			}
			$.when(stopPending()).then($('.mblazonry-timer-counter').counter(settings));
		}

		function resetCounter()
		{
			settings.initial = '00:00:00';
			$('.mblazonry-timer-counter').counter('reset');
		}

		////////////////
		// Timer Sync //
		////////////////

		/**
		 * Starts Timer asynchronous polling for timer updates.
		 * 	The value returned by setInterval() is used by clearInterval(), so save it.
		 * @example See {@link http://www.w3schools.com/js/js_timing.asp|JavaScript Timing Events}
		 * @param  {Integer} interval The number of seconds between checks.
		 */
		function pollTimer(interval)
		{
			if (timeout) // we reset the timeout
			{
				window.clearTimeout(timeout);
			}

			if (interval && interval != "0") // supplied as an argument
			{
				timeout = window.setInterval(checkTimer, interval * 60 * 1000);
			}
			else if (pollInterval && pollInterval != "0") // set by user
			{
				timeout = window.setInterval(checkTimer, pollInterval * 60 * 1000);
			}
			else // default value
			{
				timeout = window.setInterval(checkTimer, 5 * 60 * 1000);
			}
		}

		/**
		 * The whole premise of this method is to poll the timer state
		 * from the server at an arbitrary time interval to see if things
		 * have changed and update the timer states accordingly.
		 *
		 * As each tab may run its own timer instance, this functionality
		 * has been supplemented by cross-tab checking using HTML5 local
		 * storage, thus greatly reducing the number of checks per browser.
		 *
		 * The checkTimer() function eventually fires itself again on an
		 * arbitrary time interval set by the user in the builder.
		 */
		function checkTimer()
		{
			// Session should be valid
			if (!SESSION_TIMEDOUT)
			{
				// Save callback for debugging purposes.
				// Allows for cancellation of local storage update from console
				var updateLSid;

				// Check that we have HMTL5 LocalStorage
				if (window.localStorage)
				{
					updateLSid = setInterval(updateLS, TIMEOUT_INTERVAL);
				}

				// check for no outstadning saves or actions
				if (!pendingActions)
				{
					$.when(userModel.updateData()).then(function ()
					{
						if (!startTimeIsValid())
						{
							handleChangedStartTime();
							window.console.log("Polled: invalid start time");
						}
						else
						{
							// start the timer
							window.console.log("Polled: start time valid!");
						}
					});
					pollTimer();
				}
				else // allow action to complete and check back soon.
				{
					window.setTimeout(checkTimer, 20 * 1000);
				}
			}
		}

		/**
		 * Verifies the validity of our in-memory startTime.
		 * @return {Boolean} False if the in-memory startTime is different from the one that is saved on the server.
		 */
		function startTimeIsValid()
		{


			queriedStartTime = queryStartTime();


			return (startTime == queriedStartTime);
		}

		/**
		 * Queries for a changed timer Start Time value.
		 * @return {String} The updated timer_Start_Time if one is found when
		 *                      querying the userModel, returning false otherwise;
		 */
		function queryStartTime()
		{
			var queryUserModel = $m.getModel(xmlDefinition.attr("model"));
			var queryUser = queryUserModel.getFirstRow();
			var sfDateTime = queryUserModel.getFieldValue(queryUser, startTimeDestField);
			return sfDateTime;
		}

		function handleChangedStartTime()
		{
			// FIXME
			// this should probably either stop the timer or
			// reset it with the new start time
			//userModel.updateRow(user, pendingActions, true);

			if (queriedStartTime) // means we have a new start time
			{
				if (startTime !== queriedStartTime)
				{
					// Another tab has finished the current job.
					// Cancel and restart
					startTime = queriedStartTime;
					restartCounter();
				}
			}
			else // means the start time has gone
			{
				// Stop the timer
			}
		}

		////////////////////////
		// HTML5 LS Functions //
		////////////////////////

		/**
		 * Checks whether an entry has already been made in local storage
		 * and allows server polling and/or updates local storage as appropriate
		 *
		 * Called periodically, every TIMEOUT_INTERVAL seconds.
		 */
		function updateLS()
		{
			if (localStorage.masterTabId === undefined)
			{
				// No masterTabId in LS means the current tab is either:
				// - the first of the browser's tabs to be loaded
				// OR the old masterTab was closed, thus we can assign
				// the current tab as the new master tab.

				// We create a unique ID for this tab.
				window.masterTabId = Math.floor(Math.random() * 10e5);
				// assign Tab Id to LS
				localStorage.masterTabId = window.masterTabId;
				setLSExpiryTimestamp();
				// clear the master tab ID before closing the tab
				window.onunload = (() =>
				{
					clearInterval(errorChecker);
					window.localStorage.masterTabId = undefined;
				});
			}
			// the current tab is not the master tab
			else if (window.localStorage.masterTabId !== undefined)
			{
				// Do Nothing, because:
				// - either this is the master tab and we've already
				// updated the LS cache with the appropriate data; or
				// - this isn't the master tab and we don't have to do
				// anything.
			}
		}

		/**
		 * Writes an expiry date timestamp to the LocalStorage
		 * @example It's not possible to specify expiration of LS as seen here {@link https://stackoverflow.com/questions/2326943/when-do-items-in-html5-local-storage-expire}
		 * @param {Date} date The expiry date.
		 */
		function setLSExpiryTimestamp(date)
		{
			var expiryDate;

			if (date) // Expire whenever + TIMEOUT_INTERVAL
			{
				expiryDate = new Date(date);
			}
			else // Expire now + TIMEOUT_INTERVAL
			{
				expiryDate = new Date();
			}
			expiryDate = expiryDate.setMinutes(expiryDate.getMinutes() + (pollInterval / (60 * 1000)));
			localStorage.expiryDate = expiryDate;
		}

		/**
		 * Checks whether a session has expired
		 *  by presence of a skuid error banner,
		 *  it then polls the server.
		 */
		function checkForSkuidErrorsDiv()
		{
			// Hunt for Skuid problems on page
			var nx_problem_divs = document.getElementsByClassName('nx-problem'),
				errorFound = false;

			if (nx_problem_divs.length !== 0)
			{
				for (var div in nx_problem_divs)
				{
					// Trigger on server comms failure
					if (div.innerHTML == '1. Unable to connect to the server (communication failure).')
					{
						errorFound = true;
					}
					else
					{
						// create a timestamp with offset of TIMEOUT_INTERVAL minutes
						setLSExpiryTimestamp(localStorage.expiryDate);
					}
				}
			}
			return errorFound;
		}

		///////////////////////
		// Utility Functions //
		///////////////////////

		/**
		 * Takes an XML top-level action node and runs all of its child actions.
		 * @param  {Object} actionsNode the XML top-level action node
		 */
		function runActions(actionsNode)
		{
			if (actionsNode && actionsNode.length)
			{
				var res = $a.runActionsNode(actionsNode, component, component.context ||
				{});
				return res;
			}
		}

		function zeroPad(num, size)
		{
			size = (typeof size !== 'undefined' ? size : 2);
			var s = num + "";
			while (s.length < size)
			{
				s = "0" + s;
			}
			return s;
		}

		function elapsedInMilis(sfDateTime)
		{
			// Convert sfDateTime to jsDateTime
			var jsDate = $t.parseSFDateTime(sfDateTime);
			// Adjust for user's current timezone
			jsDate = $t.getLocalDateTime(jsDate);
			// Get the time now
			var today = new Date();
			return Math.abs(today - jsDate);
		}

		function jsDateTimeRemoveMilis(jsDateTime)
		{
			var sfDateTime = jsDateTime.split('.');
			return (sfDateTime[0] + ".000+0000");
		}

		function parseDateForCounter(E)
		{
			E /= 1000;

			// get seconds (Original had 'round' which incorrectly counts 0:28, 0:29, 1:30 ... 1:59, 1:0)
			var SS = Math.round(E % 60);

			// remove seconds from the date
			E = Math.floor(E / 60);

			// get minutes
			var MM = Math.round(E % 60);

			// remove minutes from the date
			E = Math.floor(E / 60);

			// get hours
			var HH = Math.round(E % 24);

			HH = zeroPad(HH);
			MM = zeroPad(MM);
			SS = zeroPad(SS);
			return HH + ":" + MM + ":" + SS;
		}
		/**
		 * Removes handlebars.
		 * @param  {String} stached The value to remove handlebars from
		 * @return {String}         The value we attemped to remove handlebars from.
		 */
		function noStache(stached)
		{
			if (stached)
			{
				var noStache = /{{\s*([^}]+)\s*}}/g;
				return noStache.exec(stached)[1];
			}
			return stached;
		}
	}

	/**
	 *
	 * @memberOf skuid
	 * @namespace skuid.componentType
	 */
	skuid.componentType
	/**
	 * Registers a Component Type with the given typeName.
	 * 	A registered Component Type acts like a constructor
	 * 	or initializer for that Component.
	 * @example $S.componentType.register()
	 *
	 * @function
	 * @name register
	 * @memberOf skuid.componentType
	 * @param {string} typeName           The name of the registered Component Type
	 *                                    e.g. "fieldeditor", "barchart", "calendar"
	 * @param {function} typeDefinition   A function that "initializes" or "constructs"
	 *                                    an instance of the Component.
	 *                                    The function has the following signature:
	 *                                    function( element, xmlDefinition, component )
	 */
	.register("mblazonry__timer", Runtime_timer);
})(window.skuid.$, window.skuid, window);
