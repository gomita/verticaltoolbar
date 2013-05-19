Components.utils.import("resource://gre/modules/Services.jsm");
const gCmdCustomize = "cmd_CustomizeToolbars";

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
		// hide download indicator and placeholder
		this._window.DownloadsButton.customizeStart();
		this._window.PlacesToolbarHelper.customizeStart();
		this._window.document.getElementById(gCmdCustomize).setAttribute("disabled", "true");
		// focus the window if it is in background
		window.focus();
		// disable Customize button in fullscreen mode
		if (this._window.fullScreen)
			document.documentElement.getButton("extra2").setAttribute("disabled", "true");
	},

	done: function(aAndCustomize) {
		// show download indicator and placeholder
		this._window.DownloadsButton.customizeDone();
		this._window.PlacesToolbarHelper.customizeDone();
		this._window.VerticalToolbar.loadPrefs(this._window.fullScreen);
		this._window.document.getElementById(gCmdCustomize).removeAttribute("disabled");
		if (aAndCustomize && !this._window.fullScreen)
			// starting customization should be after PTH_customizeDone
			this._window.document.getElementById(gCmdCustomize).doCommand();
		this._window = null;
		if (aAndCustomize)
			window.close();
	},

	onChange: function() {
		// apply prefs change now
		this._window.VerticalToolbar.loadPrefs(this._window.fullScreen);
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

};

