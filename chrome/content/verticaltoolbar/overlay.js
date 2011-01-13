var VerticalToolbar = {

	toolbox: null,
	sidebar: null,

	_autohide: false,
	_sidesync: false,

	init: function() {
		this.toolbox = document.getElementById("vertical-toolbox");
		this.sidebar = document.getElementById("sidebar-box");
		this.loadPrefs();
		// add event listeners
		window.addEventListener("fullscreen", this, false);
		window.addEventListener("resize", this, false);
		gNavToolbox.addEventListener("beforecustomization", this, false);
		gNavToolbox.addEventListener("aftercustomization", this, false);
		this.toolbox.addEventListener("transitionend", this, false);
		this.sidebar.addEventListener("DOMAttrModified", this, false);
		Services.obs.addObserver(this, "lightweight-theme-changed", false);
		// check whether the default theme is active or not
		if (!Services.prefs.prefHasUserValue("general.skins.selectedSkin")) {
			// the value of |os| is one of |Win|, |Mac| and |Lin|
			var os = navigator.platform.substr(0, 3);
			this.toolbox.firstChild.setAttribute("defaulttheme", os);
		}
	},

	uninit: function() {
		// remove event listeners
		Services.obs.removeObserver(this, "lightweight-theme-changed", false);
		window.removeEventListener("fullscreen", this, false);
		window.removeEventListener("resize", this, false);
		gNavToolbox.removeEventListener("beforecustomization", this, false);
		gNavToolbox.removeEventListener("aftercustomization", this, false);
		this.toolbox.removeEventListener("transitionend", this, false);
		this.sidebar.removeEventListener("DOMAttrModified", this, false);
		this.toolbox = null;
		this.sidebar = null;
	},

	// load prefs and update UI
	// if aDisplay is specified, override the original display value
	loadPrefs: function(aDisplay) {
		var branch = Services.prefs.getBranch("extensions.verticaltoolbar.");
		// direction
		this.toolbox.parentNode.setAttribute("dir", branch.getCharPref("direction"));
		// display
		var display = (aDisplay === undefined) ? branch.getIntPref("display") : aDisplay;
		this._autohide = (display == 2);
		this._sidesync = branch.getBoolPref("sidesync");
		this.toolbox.collapsed = (display == 0);
		// reset attributes and styles
		this.toolbox.removeAttribute("autohide");
		this.toolbox.removeAttribute("animate");
		this.toolbox.removeAttribute("dragover");
		this.toolbox.removeAttribute("sidesync");
		this.toolbox.firstChild.removeAttribute("style");
		this.toolbox.style.removeProperty("opacity");
		// [autohide]
		if (this._autohide) {
			// remember the original toolbar width before changing attributes for later use
			var width = this.toolbox.firstChild.boxObject.width;
			this.toolbox.setAttribute("autohide", "true");
			// adjust toolbar height
			// XXXdon't use dispatchEvent to avoid involving non-related listeners
			this.handleEvent({ type: "resize" });
			// attach background image if Personas is enabled
			// XXXdon't use notifyObservers to avoid involving non-related observers
			this.observe(null, "lightweight-theme-changed", null);
			// [autohide][animate]
			if (branch.getBoolPref("animate")) {
				this.toolbox.setAttribute("animate", "true");
				// adjust toolbar margin to keep out of the screen
				var dir = this.toolbox.parentNode.getAttribute("dir") || 
				          window.getComputedStyle(this.toolbox.parentNode, null).direction;
				if (dir == "ltr")
					this.toolbox.firstChild.style.marginLeft = (width * -1).toString() + "px";
				else
					this.toolbox.firstChild.style.marginRight = (width * -1).toString() + "px";
			}
			// [autohide][sidesync]
			if (this._sidesync && !this.sidebar.hidden)
				this.toolbox.setAttribute("sidesync", "true");
		}
	},

	handleEvent: function(event) {
		switch (event.type) {
			case "dragenter": 
				if (!this._autohide)
					return;
				// [autohide] show toolbar when hovering or dragging over toolbar
				this.toolbox.style.removeProperty("opacity");
				this.toolbox.setAttribute("dragover", "true");
				break;
			case "mouseout": 
			case "dragleave": 
				if (!this._autohide)
					return;
				if (this._sidesync && !this.sidebar.hidden)
					return;
				var elt = event.relatedTarget;
				while (elt) {
					if (elt == this.toolbox)
						return;
					elt = elt.parentNode;
				}
				// [autohide] hide toolbar when moving or dragging outside toolbar
				this.toolbox.removeAttribute("dragover");
				break;
			case "fullscreen": 
				if (!window.fullScreen) {
					// entering fullscreen mode
					var pref = "extensions.verticaltoolbar.display.fullscreen";
					this.loadPrefs(Services.prefs.getIntPref(pref));
				}
				else {
					// exiting fullscreen mode
					this.loadPrefs();
				}
				break;
			case "resize": 
				if (!this._autohide)
					return;
				// [autohide] adjust toolbar height
				var height = this.toolbox.parentNode.boxObject.height;
				this.toolbox.firstChild.style.height = height.toString() + "px";
				break;
			case "beforecustomization": 
				// force disable autohide when starting customization
				this.loadPrefs(1);
				break;
			case "aftercustomization": 
				// restore original autohide when finishing customization
				this.loadPrefs();
				break;
			case "DOMAttrModified": 
				if (this._autohide && this._sidesync && 
				    event.target.id == "sidebar-box" && event.attrName == "hidden")
					// [autohide][sidesync] show toolabr when opening sidebar
					// [autohide][sidesync] hide toolbar when closing sidebar
					this.loadPrefs();
				break;
			case "transitionend": 
				if (!this._autohide || event.target != this.toolbox.firstChild)
					return;
				// [autohide] make 1px toolbar invisible
				if (window.getComputedStyle(this.toolbox, null).width == "1px")
					this.toolbox.style.opacity = 0;
				break;
			case "mouseover": 
				if (!this._autohide)
					return;
				this.toolbox.style.removeProperty("opacity");
				break;
			case "mouseup": 
				// fix invalid toolbar width after dragging sidebar splitter extremely
				window.setTimeout(function(self) {
					self.toolbox.removeAttribute("width");
				}, 0, this);
				break;
		}
	},

	config: function() {
		window.openDialog(
			"chrome://verticaltoolbar/content/options.xul", "VerticalToolbar:Options",
			"chrome,centerscreen,dependent"
		);
	},

	observe: function(aSubject, aTopic, aData) {
		if (aTopic != "lightweight-theme-changed")
			return;
		var toolbar = this.toolbox.firstChild;
		var root = document.documentElement;
		toolbar.style.backgroundColor = root.style.backgroundColor;
		toolbar.style.backgroundImage = root.style.backgroundImage;
	},

};


window.addEventListener("load", function() { VerticalToolbar.init(); }, false);
window.addEventListener("unload", function() { VerticalToolbar.uninit(); }, false);

