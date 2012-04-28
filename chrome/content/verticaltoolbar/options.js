Components.utils.import("resource://gre/modules/Services.jsm");

var PrefsUI = {

	_window: null,

	init: function() {
		this._window = Services.wm.getMostRecentWindow("navigator:browser");
		if (!this._window)
			window.close();
		// init UI
		var toolbar = this._window.VerticalToolbar.toolbox.firstChild;
		document.getElementById("button_mode").value = toolbar.getAttribute("mode");
		document.getElementById("borders").checked = toolbar.getAttribute("flatbutton") != "true";
		this.updateAutoHideOptions();
		// always show accept button
		if (document.documentElement.instantApply) {
			var button = document.documentElement.getButton("accept");
			button.hidden = false;
			button.disabled = false;
		}
		// show toolbar temporarily even if autohide is enabled
		this._window.VerticalToolbar.handleEvent({ type: "dragenter" });
		// [Firefox15] hide download indicator and placeholder
		if (this._window.DownloadsButton)
			this._window.DownloadsButton.customizeStart();
		// focus the window if it is in background
		window.focus();
	},

	done: function() {
		// [Firefox15] show download indicator and placeholder
		if (this._window.DownloadsButton)
			this._window.DownloadsButton.customizeDone();
		this._window.VerticalToolbar.loadPrefs();
		this._window = null;
	},

	onChange: function() {
		// apply prefs change now
		this._window.VerticalToolbar.loadPrefs();
		this._window.VerticalToolbar.toolbox.setAttribute("dragover", "true");
	},

	updateAutoHideOptions: function() {
		var autohide = document.getElementById("display").value == 2 || 
		               document.getElementById("fullscreen").value == 2;
		document.getElementById("animate").disabled = !autohide;
		document.getElementById("sidesync").disabled = !autohide;
	},

	readPlacement: function(aRadioGroup) {
		var val = document.getElementById("placement").value;
		aRadioGroup.selectedIndex = val == 0 ? 0 : 1;
		aRadioGroup.lastChild.disabled = val == 0;
		aRadioGroup.lastChild.checked = val == 2;
	},

	writePlacement: function(aRadioGroup) {
		var val = aRadioGroup.selectedIndex;
		if (val == 1 && aRadioGroup.lastChild.checked)
			val = 2;
		return val;
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

