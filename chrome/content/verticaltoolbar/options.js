Components.utils.import("resource://gre/modules/Services.jsm");

var PrefsUI = {

	_window: null,
	_defaultDir: "",

	init: function() {
		this._window = Services.wm.getMostRecentWindow("navigator:browser");
		if (!this._window)
			window.close();
		// init UI
		var toolbar = this._window.VerticalToolbar.toolbox.firstChild;
		document.getElementById("button_mode").value = toolbar.getAttribute("mode");
		document.getElementById("borders").checked = toolbar.getAttribute("flatbutton") != "true";
		// always show accept button
		if (document.documentElement.instantApply) {
			var button = document.documentElement.getButton("accept");
			button.hidden = false;
			button.disabled = false;
		}
		// select proper radio button if direction pref has default empty value
		var browser = this._window.VerticalToolbar.toolbox.parentNode;
		this._defaultDir = this._window.getComputedStyle(browser, null).direction;
		var direction = document.getElementById("direction");
		if (!direction.value)
			direction.value = this._defaultDir;
		// show toolbar temporarily even if autohide is enabled
		this._window.VerticalToolbar.handleEvent({ type: "dragenter" });
		// focus the window if it is in background
		window.focus();
	},

	done: function() {
		// reset direction pref if the value equals to the original direction
		var direction = document.getElementById("direction");
		if (direction.value == this._defaultDir)
			direction.reset();
		this._window.VerticalToolbar.loadPrefs();
		this._window = null;
	},

	onChange: function() {
		// apply prefs change now
		this._window.VerticalToolbar.loadPrefs();
		this._window.VerticalToolbar.toolbox.setAttribute("dragover", "true");
		var autohide = document.getElementById("display").value == 2 || 
		               document.getElementById("fullscreen").value == 2;
		document.getElementById("animate").disabled = !autohide;
		document.getElementById("sidesync").disabled = !autohide;
	},

	updateButtonMode: function(val) {
		var toolbar = this._window.VerticalToolbar.toolbox.firstChild;
		toolbar.setAttribute("mode", val.toString());
		this.onChange();
	},

	updateBorders: function(val) {
		var toolbar = this._window.VerticalToolbar.toolbox.firstChild;
		toolbar.setAttribute("flatbutton", (!val).toString());
		this.onChange();
	},

	customize: function() {
		this._window.document.getElementById("cmd_CustomizeToolbars").doCommand();
		window.close();
	},

};

