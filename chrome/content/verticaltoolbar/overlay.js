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
		Services.obs.removeObserver(this, "lightweight-theme-changed");
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
		// placement
		var placement = branch.getIntPref("placement");
		if (placement == 1) {
			// avoid unnecessary DOM manipulations
			if (this.toolbox.nextSibling)
				this.toolbox.parentNode.appendChild(this.toolbox);
		}
		else {
			if (this.toolbox.nextSibling != this.sidebar)
				this.toolbox.parentNode.insertBefore(this.toolbox, this.sidebar);
		}
		if (placement == 2)
			this.toolbox.parentNode.setAttribute("dir", "rtl");
		else
			this.toolbox.parentNode.removeAttribute("dir");
		this.toolbox.setAttribute("placement", placement == 0 ? "left" : "right");
		// display
		var display = (aDisplay === undefined) ? branch.getIntPref("display") : aDisplay;
		this._autohide = (display == 2);
		if (this._autohide) {
			var button = document.getElementById("verticaltoolbar-button");
			if (button)
				this._autohide = button.getAttribute("checked") != "true";
		}
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
				if (dir == "ltr" && placement == 0)
					this.toolbox.firstChild.style.marginLeft = (width * -1).toString() + "px";
				else
					this.toolbox.firstChild.style.marginRight = (width * -1).toString() + "px";
			}
			// [autohide][sidesync]
			if (this._sidesync && !this.sidebar.hidden)
				this.toolbox.setAttribute("sidesync", "true");
		}
		var elt = document.getElementById("PlacesToolbarItems");
		if (elt) {
			// Bookmark Toolbar Items exists
			elt.removeEventListener("DOMMouseScroll", this, false);
			// restore PlacesToolbar methods
			var proto = PlacesToolbar.prototype;
			if (proto.__getDropPoint) {
				proto._getDropPoint = proto.__getDropPoint;
				delete proto.__getDropPoint;
			}
			if (proto.__onDragOver) {
				proto._onDragOver = proto.__onDragOver;
				delete proto.__onDragOver;
			}
		}
		if (document.querySelector("#" + this.toolbox.id + " #" + elt.id)) {
			// Bookmark Toolbar Items exists on Vertical Toolbar
			elt.addEventListener("DOMMouseScroll", this, false);
			// remove attribute to allow CSS customization
			elt.removeAttribute("orient");
			// backup and modify PlacesToolbar methods
			var proto = PlacesToolbar.prototype;
			if (!proto.__getDropPoint) {
				proto.__getDropPoint = proto._getDropPoint;
//				window.eval(
//					"PlacesToolbar.prototype._getDropPoint = " + 
//					proto.__getDropPoint.toSource().
//					replace(/this\.isRTL/g, "false").
//					replace(/\.width/g, ".height").
//					replace(/\.left/g, ".top").
//					replace(/\.right/g, ".bottom").
//					replace(/\.clientX/g, ".clientY")
//				);
				// --- patch begin
				proto._getDropPoint = function PT__getDropPoint(aEvent) {
					let result = this.result;
					if (!PlacesUtils.nodeIsFolder(this._resultNode))
						return null;
					let dropPoint = { ip: null, beforeIndex: null, folderElt: null };
					let elt = aEvent.target;
					if (elt._placesNode && elt != this._rootElt && elt.localName != "menupopup") {
						let eltRect = elt.getBoundingClientRect();
						let eltIndex = Array.indexOf(this._rootElt.childNodes, elt);
						if (PlacesUtils.nodeIsFolder(elt._placesNode) && !PlacesUtils.nodeIsReadOnly(elt._placesNode)) {
							// This is a folder.
							let threshold = eltRect.height * 0.25;
							if (aEvent.clientY < eltRect.top + threshold) {
								// Drop before this folder.
								dropPoint.ip = new InsertionPoint(
									PlacesUtils.getConcreteItemId(this._resultNode), 
									eltIndex, Ci.nsITreeView.DROP_BEFORE
								);
								dropPoint.beforeIndex = eltIndex;
							}
							else if (aEvent.clientY < eltRect.bottom - threshold) {
								// Drop inside this folder.
								dropPoint.ip = new InsertionPoint(
									PlacesUtils.getConcreteItemId(elt._placesNode), -1, 
									Ci.nsITreeView.DROP_ON, PlacesUtils.nodeIsTagQuery(elt._placesNode)
								);
								dropPoint.beforeIndex = eltIndex;
								dropPoint.folderElt = elt;
							}
							else {
								// Drop after this folder.
								let beforeIndex = (eltIndex == this._rootElt.childNodes.length - 1) ? -1 : eltIndex + 1;
								dropPoint.ip = new InsertionPoint(
									PlacesUtils.getConcreteItemId(this._resultNode), beforeIndex, 
									Ci.nsITreeView.DROP_BEFORE
								);
								dropPoint.beforeIndex = beforeIndex;
							}
						}
						else {
							// This is a non-folder node or a read-only folder.
							let threshold = eltRect.height * 0.5;
							if (aEvent.clientY < eltRect.top + threshold) {
								// Drop before this bookmark.
								dropPoint.ip = new InsertionPoint(
									PlacesUtils.getConcreteItemId(this._resultNode), eltIndex, 
									Ci.nsITreeView.DROP_BEFORE
								);
								dropPoint.beforeIndex = eltIndex;
							}
							else {
								// Drop after this bookmark.
								let beforeIndex = eltIndex == this._rootElt.childNodes.length - 1 ? -1 : eltIndex + 1;
								dropPoint.ip = new InsertionPoint(
									PlacesUtils.getConcreteItemId(this._resultNode), beforeIndex, 
									Ci.nsITreeView.DROP_BEFORE
								);
								dropPoint.beforeIndex = beforeIndex;
							}
						}
					}
					else {
						// dragging on the padding area of hbox element
						if (elt.nodeName == "hbox")
							return null;
						// We are most likely dragging on the empty area of the toolbar
						dropPoint.ip = new InsertionPoint(
							PlacesUtils.getConcreteItemId(this._resultNode), -1, 
							Ci.nsITreeView.DROP_BEFORE
						);
						dropPoint.beforeIndex = -1;
					}
					return dropPoint;
				};
				// --- patch end
			}
			if (!proto.__onDragOver) {
				proto.__onDragOver = proto._onDragOver;
//				window.eval(
//					"PlacesToolbar.prototype._onDragOver = " + 
//					proto.__onDragOver.toSource().
//					replace(/this\.isRTL/g, "false").
//					replace(/\.clientWidth/g, ".clientHeight").
//					replace(/\.left/g, ".top").
//					replace(/\.right/g, ".bottom").
//					replace(/translate\(/g, "translateY(").
//					replace(/MozMarginStart/g, "MozMarginTop")
//				);
				// --- patch begin
				proto._onDragOver = function PT__onDragOver(aEvent) {
					PlacesControllerDragHelper.currentDropTarget = aEvent.target;
					let dt = aEvent.dataTransfer;
					let dropPoint = this._getDropPoint(aEvent);
					if (!dropPoint || !dropPoint.ip || !PlacesControllerDragHelper.canDrop(dropPoint.ip, dt)) {
						this._dropIndicator.collapsed = true;
						aEvent.stopPropagation();
						return;
					}
					if (this._ibTimer) {
						this._ibTimer.cancel();
						this._ibTimer = null;
					}
					if (dropPoint.folderElt || aEvent.originalTarget == this._chevron) {
						// Dropping over a menubutton or chevron button.
						let overElt = dropPoint.folderElt || this._chevron;
						if (this._overFolder.elt != overElt) {
							this._clearOverFolder();
							this._overFolder.elt = overElt;
							this._overFolder.openTimer = this._setTimer(this._overFolder.hoverTime);
						}
						if (!this._overFolder.elt.hasAttribute("dragover"))
							this._overFolder.elt.setAttribute("dragover", "true");
						this._dropIndicator.collapsed = true;
					}
					else {
						// Dragging over a normal toolbarbutton,
						let ind = this._dropIndicator;
						let halfInd = ind.clientHeight / 2;
						let translateY;
						halfInd = Math.floor(halfInd);
						translateY = 0 - this._rootElt.getBoundingClientRect().top + halfInd;
						if (this._rootElt.firstChild) {
							if (dropPoint.beforeIndex == -1)
								translateY += this._rootElt.lastChild.getBoundingClientRect().bottom;
							else
								translateY += this._rootElt.childNodes[dropPoint.beforeIndex].getBoundingClientRect().top;
						}
						ind.style.transform = "translateY(" + Math.round(translateY) + "px)";	// [Firefox16]
						ind.style.MozTransform = "translateY(" + Math.round(translateY) + "px)";	// [Firefox15]
						ind.style.MozMarginTop = (-ind.clientHeight) + "px";
						ind.collapsed = false;
						this._clearOverFolder();
					}
					aEvent.preventDefault();
					aEvent.stopPropagation();
				};
				// --- patch end
			}
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
			case "DOMMouseScroll": 
				var scrollBox = document.getElementById("PlacesToolbarItems").
				                boxObject.QueryInterface(Ci.nsIScrollBoxObject);
				scrollBox.scrollByLine(event.detail);
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

