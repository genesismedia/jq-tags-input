/* global jQuery */
/*
    jqTagsInput Plugin 1.4.1

    Forked from: http://xoxco.com/clickable/jquery-tags-input

    Licensed under the MIT license:
    http://www.opensource.org/licenses/mit-license.php
*/
(function ($) {
	var delimiter = [];
	var tags_callbacks = [];

	$.fn.doAutosize = function (o) {
		var $input = $(this);
		var minWidth = $input.data("minwidth");
		var maxWidth = $input.data("maxwidth");
		var val = "";
		var testSubject = $("#" + $input.data("tester_id"));

		if (val === (val = $input.val())) {
			return;
		}

		// Enter new content into testSubject
		var escaped = val.replace(/&/g, "&amp;").replace(/\s/g, " ").replace(/</g, "&lt;").replace(/>/g, "&gt;");
		testSubject.html(escaped);
		// Calculate new width + whether to change
		var testerWidth = testSubject.width(),
			newWidth = (testerWidth + o.comfortZone) >= minWidth ? testerWidth + o.comfortZone : minWidth,
			currentWidth = $input.width(),
			isValidWidthChange =
				(newWidth < currentWidth && newWidth >= minWidth) ||
				(newWidth > minWidth && newWidth < maxWidth);

		// Animate width
		if (isValidWidthChange) {
			$input.width(newWidth);
		}
	};

	$.fn.resetAutosize = function (options) {
		var $input = $(this);
		var minWidth = $input.data("minwidth") || options.minInputWidth || $input.width();
		var maxWidth = $input.data("maxwidth") || options.maxInputWidth || ($input.closest(".tagsinput").width() - options.inputPadding);
		var testSubject = $("<tester/>").css({
			position: "absolute",
			top: -9999,
			left: -9999,
			width: "auto",
			fontSize: $input.css("fontSize"),
			fontFamily: $input.css("fontFamily"),
			fontWeight: $input.css("fontWeight"),
			letterSpacing: $input.css("letterSpacing"),
			whiteSpace: "nowrap"
		});
		var testerId = $input.attr("id") + "_autosize_tester";
		if (!$("#" + testerId).length) {
			testSubject.attr("id", testerId);
			testSubject.appendTo("body");
		}

		$input.data("minwidth", minWidth);
		$input.data("maxwidth", maxWidth);
		$input.data("tester_id", testerId);
		$input.css("width", minWidth);
	};

	$.fn.addTag = function (value, options) {
		options = $.extend({ focus: false, callback: true }, options);
		this.each(function () {
			var $this = $(this);
			var id = $this.attr("id");

			var tagslist = _splitMulti($this.val(), delimiter[id]);

			value = $.trim(value);

			var skipTag = false;
			if (options.unique) {
				skipTag = $this.tagExist(value);
				if(!skipTag && tags_callbacks[id] && tags_callbacks[id].tagValidator) {
					skipTag = value !== "" && !tags_callbacks[id].tagValidator(value);
				}
				if (skipTag == true) {
					//Marks fake input as not_valid to let styling it
					$("#" + id + "_tag").addClass("not_valid");
				}
			}

			if (value != "" && skipTag != true) {
				$("<span>").addClass("tag").append(
					$("<span>").text(value),
					$("<a>", {
						href: "#",
						title: "Removing tag",
						text: "x"
					}).click(function () {
						return $("#" + id).removeTag(escape(value));
					})
				).insertBefore("#" + id + "_addTag");

				tagslist.push(value);

				$("#" + id + "_tag").val("");
				if (options.focus) {
					$("#" + id + "_tag").focus();
				} else {
					$("#" + id + "_tag").blur();
				}

				$.fn.tagsInput.updateTagsField(this, tagslist);

				if (options.callback && tags_callbacks[id]) {
					if (tags_callbacks[id].onAddTag) {
						tags_callbacks[id].onAddTag.call(this, value);
					}
					if (tags_callbacks[id].onChange) {
						var i = tagslist.length;
						tags_callbacks[id].onChange.call(this, $(this), tagslist[i - 1]);
					}
				}
			}
		});

		return false;
	};

	$.fn.removeTag = function (value) {
		value = unescape(value);
		this.each(function () {
			var $this = $(this);
			var id = $this.attr("id");

			var old = _splitMulti($this.val(), delimiter[id]);

			$("#" + id + "_tagsinput .tag").remove();
			var str = "";
			for (var i = 0; i < old.length; i++) {
				if (old[i] != value) {
					str = str + getDefaultDelimiter(id) + old[i];
				}
			}

			$.fn.tagsInput.importTags(this, str);

			if (tags_callbacks[id] && tags_callbacks[id].onRemoveTag) {
				tags_callbacks[id].onRemoveTag.call(this, value);
			}
		});

		return false;
	};

	$.fn.tagExist = function (val) {
		var $this = $(this);
		var id = $this.attr("id");
		var tagslist = _splitMulti($this.val(), delimiter[id]);
		return ($.inArray(val, tagslist) >= 0); //true when tag exists, false when not
	};

	// clear all existing tags and import new ones from a string
	$.fn.importTags = function (str) {
		this.each(function(){
			var id = $(this).attr("id");
			$("#" + id + "_tagsinput .tag").remove();
			$.fn.tagsInput.importTags(this, str);
		});
		return this;
	};

	$.fn.tagsInput = function (options) {
		var settings = $.extend({
			interactive: true,
			defaultText: "add a tag",
			minChars: 0,
			width: "auto",
			height: "auto",
			autocomplete: { selectFirst: false },
			hide: true,
			delimiter: ",",
			unique: true,
			removeWithBackspace: true,
			placeholderColor: "#666666",
			autosize: true,
			comfortZone: 20,
			inputPadding: 6 * 2
		}, options);

		var uniqueIdCounter = 0;

		this.each(function () {
			var $this = $(this);
			// If we have already initialized the field, do not do it again
			if (typeof $this.attr("data-tagsinput-init") !== "undefined") {
				return;
			}

			// Mark the field as having been initialized
			$this.attr("data-tagsinput-init", true);

			if (settings.hide) {
				$this.hide();
			}
			var id = $this.attr("id");
			if (!id || delimiter[id]) {
				id = "tags" + new Date().getTime() + (uniqueIdCounter++);
				$this.attr("id", id);
			}

			var data = $.extend({
				pid: id,
				real_input: "#" + id,
				holder: "#" + id + "_tagsinput",
				input_wrapper: "#" + id + "_addTag",
				fake_input: "#" + id + "_tag"
			}, settings);

			delimiter[id] = data.delimiter;

			if (settings.onAddTag || settings.onRemoveTag || settings.onChange || settings.tagValidator) {
				tags_callbacks[id] = {
					onAddTag: settings.onAddTag,
					onRemoveTag: settings.onRemoveTag,
					onChange: settings.onChange,
					tagValidator: settings.tagValidator
				};
			}

			var markup = "<div id=\"" + id + "_tagsinput\" class=\"tagsinput\"><div id=\"" + id + "_addTag\">";

			if (settings.interactive) {
				markup = markup + "<input id=\"" + id + "_tag\" value=\"\" data-default=\"" + settings.defaultText + "\" />";
			}

			markup = markup + "</div><div class=\"tags_clear\"></div></div>";

			$(markup).insertAfter(this);

			var $holder = $(data.holder);
			var $realInput = $(data.real_input);

			$holder.css("width", settings.width);
			$holder.css("min-height", settings.height);
			$holder.css("height", settings.height);

			if ($realInput.val() != "") {
				$.fn.tagsInput.importTags($realInput, $realInput.val());
			}
			if (settings.interactive) {
				var $fakeInput = $(data.fake_input);
				$fakeInput.val($fakeInput.attr("data-default"));
				$fakeInput.css("color", settings.placeholderColor);
				$fakeInput.resetAutosize(settings);

				$holder.bind("click", data, function (event) {
					$(event.data.fake_input).focus();
				});

				$fakeInput.bind("focus", data, function (event) {
					if ($(event.data.fake_input).val() == $(event.data.fake_input).attr("data-default")) {
						$(event.data.fake_input).val("");
					}
					$(event.data.fake_input).css("color", "#000000");
				});

				if (settings.autocomplete_url != undefined) {
					var autocomplete_options = { source: settings.autocomplete_url };
					for (var attrname in settings.autocomplete) {
						autocomplete_options[attrname] = settings.autocomplete[attrname];
					}

					if ($.Autocompleter !== undefined) {
						$fakeInput.autocomplete(settings.autocomplete_url, settings.autocomplete);
						$fakeInput.bind("result", data, function (event, data) {
							if (data) {
								$("#" + id).addTag(data[0] + "", { focus: true, unique: (settings.unique) });
							}
						});
					} else if ($.ui.autocomplete !== undefined) {
						$fakeInput.autocomplete(autocomplete_options);
						$fakeInput.bind("autocompleteselect", data, function (event, ui) {
							$(event.data.real_input).addTag(ui.item.value, { focus: true, unique: (settings.unique) });
							return false;
						});
					}
				} else {
					// if a user tabs out of the field, create a new tag
					// this is only available if autocomplete is not used.
					$fakeInput.bind("blur", data, function (event) {
						var d = $(this).attr("data-default");
						if ($(event.data.fake_input).val() != "" && $(event.data.fake_input).val() != d) {
							if ((event.data.minChars <= $(event.data.fake_input).val().length) && (!event.data.maxChars || (event.data.maxChars >= $(event.data.fake_input).val().length)))
								$(event.data.real_input).addTag($(event.data.fake_input).val(), { focus: true, unique: (settings.unique) });
						} else {
							$(event.data.fake_input).val($(event.data.fake_input).attr("data-default"));
							$(event.data.fake_input).css("color", settings.placeholderColor);
						}
						return false;
					});

				}

				// if user types a default delimiter like comma,semicolon and then create a new tag
				$fakeInput.bind("keypress", data, function (event) {
					if (_checkDelimiter(event)) {
						event.preventDefault();
						if ((event.data.minChars <= $(event.data.fake_input).val().length) && (!event.data.maxChars || (event.data.maxChars >= $(event.data.fake_input).val().length)))
							$(event.data.real_input).addTag($(event.data.fake_input).val(), { focus: true, unique: (settings.unique) });
						$(event.data.fake_input).resetAutosize(settings);
						return false;
					} else if (event.data.autosize) {
						$(event.data.fake_input).doAutosize(settings);
					}
				});

				//Delete last tag on backspace
				if (data.removeWithBackspace) {
					$fakeInput.bind("keydown", function (event) {
						var $this = $(this);
						if (event.keyCode == 8 && $this.val() == "") {
							event.preventDefault();
							var last_tag = $this.closest(".tagsinput").find(".tag:last").text();
							var id = $this.attr("id").replace(/_tag$/, "");
							last_tag = last_tag.replace(/[\s]+x$/, "");
							$("#" + id).removeTag(escape(last_tag));
							$this.trigger("focus");
						}
					});
				}
				$fakeInput.blur();

				//Removes the not_valid class when user changes the value of the fake input
				if (data.unique) {
					$fakeInput.keydown(function (event) {
						if (event.keyCode == 8 || String.fromCharCode(event.which).match(/\w+|[áéíóúÁÉÍÓÚñÑ,/]+/)) {
							$(this).removeClass("not_valid");
						}
					});
				}
			} // if settings.interactive
		});

		return this;

	};

	$.fn.tagsInput.updateTagsField = function (obj, tagslist) {
		var id = $(obj).attr("id");
		$(obj).val(tagslist.join(getDefaultDelimiter(id)));
	};

	$.fn.tagsInput.importTags = function (obj, val) {
		$(obj).val("");
		var id = $(obj).attr("id");
		var tags = _splitMulti(val, delimiter[id]);
		for (var i = 0; i < tags.length; i++) {
			$(obj).addTag(tags[i], { focus: false, callback: false });
		}
		if (tags_callbacks[id] && tags_callbacks[id].onChange) {
			tags_callbacks[id].onChange.call(obj, obj, tags[i]);
		}
	};

	/**
	  * check delimiter Array
	  * @param event
	  * @returns {boolean}
	  * @private
	  */
	var _checkDelimiter = function (event) {
		var found = false;
		if (event.which == 13) {
			return true;
		}

		if (typeof event.data.delimiter === "string") {
			if (event.which == event.data.delimiter.charCodeAt(0)) {
				found = true;
			}
		} else {
			$.each(event.data.delimiter, function (index, delimiter) {
				if (event.which == delimiter.charCodeAt(0)) {
					found = true;
				}
			});
		}

		return found;
	};

	function getDefaultDelimiter(id) {
		var delimiters = delimiter[id];
		if(typeof delimiter === "string") {
			return delimiters;
		}
		if($.isArray(delimiters)) {
			return delimiters[0];
		}
		return ",";
	}

	/**
	 * Splits a string using multiple delimiters
	 * @param {*} src
	 * @param {*} delimiters
	 * @returns Array
	 * @private
	 */
	function _splitMulti(src, delimiters) {
		if($.isArray(src)) {
			return src;
		}
		if(!src || typeof src !== "string") {
			return [];
		}
		if(!delimiters || delimiters.length === 0) {
			return [src];
		}
		var delimiter = delimiters;
		if(typeof delimiters !== "string") {
			// replace all delimiters to an only one (the first in the array)
			delimiter = delimiters.shift();

			// We might not need to replace, if we only have one delimiter in an array
			if(delimiters.length) {
				var re = new RegExp(delimiters.join("|"), "gi");
				src = src.replace(re, delimiter);
			}
		}

		return src.split(delimiter);
	}

})(jQuery);
