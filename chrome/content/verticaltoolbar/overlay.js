var VerticalToolbar = {

	toolbox: null,
	sidebar: null,

	_autohide: false,
	_sidesync: false,

	_sidebarObserver: null,
	_sidebarCallback: function(mutations) {
		for (let mutation of mutations) {
			// [autohide][sidesync] show/hide toolabr when opening/closing sidebar
			if (this._autohide && this._sidesync)
				this.loadPrefs(window.fullScreen);
		}
	},

	_placesbarObserver: null,
	_placesbarCallback: function(mutations) {
		for (let mutation of mutations) {
			// change the position to open menupopup
			var pos = this.toolbox.getAttribute("placement") == "left" ? "end_before" : "start_before";
			for (let node of mutation.addedNodes) {
				// check if the node is a folder which has menupopup inside
				if (node.firstChild)
					node.firstChild.setAttribute("position", pos);
			}
		}
	},

	// [Firefox28+]
	kToolbarId: "vertical-toolbar",
	_austrails: false,

	registerArea: function() {
		this._austrails = true;
		// already registered when opening the second or later window
		if (CustomizableUI.getAreaType(this.kToolbarId))
			return;
		CustomizableUI.registerArea(this.kToolbarId, {
			legacy: true,
			type: CustomizableUI.TYPE_TOOLBAR,
			defaultPlacements: [
				"tabview-button", "feed-button", "developer-button", "spring", 
				"verticaltoolbar-offline-button", "verticaltoolbar-error-console-button", 
				"sync-button"
			]
		});
	},

	init: function() {
		this.toolbox = document.getElementById("vertical-toolbox");
		this.sidebar = document.getElementById("sidebar-box");
		this.loadPrefs(false);
		// add event listeners
		window.addEventListener("fullscreen", this, false);
		window.addEventListener("resize", this, false);
		if (this._austrails)
			gNavToolbox.addEventListener("customizationstarting", this, false);
		else
			gNavToolbox.addEventListener("beforecustomization", this, false);
		gNavToolbox.addEventListener("aftercustomization", this, false);
		this.toolbox.addEventListener("transitionend", this, false);
		this._sidebarObserver = new MutationObserver(this._sidebarCallback.bind(this));
		this._sidebarObserver.observe(this.sidebar, { attributes: true, attributeFilter: ["hidden"] });
		Services.obs.addObserver(this, "lightweight-theme-changed", false);
		// check whether the default theme is active or not
		if (!Services.prefs.prefHasUserValue("general.skins.selectedSkin")) {
			// the value of |os| is one of |Win|, |Mac| and |Lin|
			var os = navigator.platform.substr(0, 3);
			this.toolbox.firstChild.setAttribute("defaulttheme", os);
		}
		// remove redundant widgets
		let getWidgetNode = function(aId) {
			// on toolbar || on palette
			return document.getElementById(aId) || gNavToolbox.palette.querySelector("#" + aId);
		};
		let removingIds = this._austrails ? [
			// [Firefox28+]
			"verticaltoolbar-addons-button",
			"verticaltoolbar-save-page-button",
			"verticaltoolbar-send-link-button",
			"verticaltoolbar-print-preview-button",
			"verticaltoolbar-private-browsing-button",
		] : [
			// [Firefox27-]
		];
		for (let id of removingIds) {
			let elt = getWidgetNode(id);
			if (elt)
				elt.parentNode.removeChild(elt);
		}
	},

	uninit: function() {
		// remove event listeners
		Services.obs.removeObserver(this, "lightweight-theme-changed");
		window.removeEventListener("fullscreen", this, false);
		window.removeEventListener("resize", this, false);
		if (this._austrails)
			gNavToolbox.removeEventListener("customizationstarting", this, false);
		else
			gNavToolbox.removeEventListener("beforecustomization", this, false);
		gNavToolbox.removeEventListener("aftercustomization", this, false);
		this.toolbox.removeEventListener("transitionend", this, false);
		this._sidebarObserver.disconnect();
		this._sidebarObserver = null;
		var elt = document.getElementById("PlacesToolbarItems");
		if (elt) {
			elt.removeEventListener("DOMMouseScroll", this, false);
			if (this._placesbarObserver) {
				this._placesbarObserver.disconnect();
				this._placesbarObserver = null;
			}
		}
		this.toolbox = null;
		this.sidebar = null;
	},

	// load prefs and update UI
	loadPrefs: function(aFullScreen, aCustomizing) {
		var branch = Services.prefs.getBranch("extensions.verticaltoolbar.");
		// placement
		var placement = branch.getIntPref("placement");
		if (placement == 1) {
			var borderEnd = document.getElementById("browser-border-end");
			// avoid unnecessary DOM manipulations
			if (this.toolbox.nextSibling != borderEnd)
				this.toolbox.parentNode.insertBefore(this.toolbox, borderEnd);
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
		var display = branch.getIntPref(aFullScreen ? "display.fullscreen" : "display");
		if (aCustomizing)
			// force disabling autohide while customizing
			display = 1;
		// autohide
		this._autohide = (display == 2);
		if (this._autohide) {
			var button = document.getElementById("verticaltoolbar-button");
			if (button)
				this._autohide = button.getAttribute("checked") != "true";
		}
		// sidesync
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
			if (this._placesbarObserver) {
				this._placesbarObserver.disconnect();
				this._placesbarObserver = null;
			}
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
		if (elt && document.querySelector("#" + this.toolbox.id + " #" + elt.id)) {
			// Bookmark Toolbar Items exists on Vertical Toolbar
			if (!aCustomizing) {
				// don't track events while customizing
				elt.addEventListener("DOMMouseScroll", this, false);
				this._placesbarObserver = new MutationObserver(this._placesbarCallback.bind(this));
				this._placesbarObserver.observe(elt, { childList: true });
			}
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
							let closed = elt.firstChild && elt.firstChild.state == "closed";
							if (closed && aEvent.clientY < eltRect.top + threshold) {
								// Drop before this folder.
								dropPoint.ip = new InsertionPoint(
									PlacesUtils.getConcreteItemId(this._resultNode), 
									eltIndex, Ci.nsITreeView.DROP_BEFORE
								);
								dropPoint.beforeIndex = eltIndex;
							}
							else if (closed && aEvent.clientY > eltRect.bottom - threshold) {
								// Drop after this folder.
								let beforeIndex = (eltIndex == this._rootElt.childNodes.length - 1) ? -1 : eltIndex + 1;
								dropPoint.ip = new InsertionPoint(
									PlacesUtils.getConcreteItemId(this._resultNode), beforeIndex, 
									Ci.nsITreeView.DROP_BEFORE
								);
								dropPoint.beforeIndex = beforeIndex;
							}
							else {
								// Drop inside this folder.
								dropPoint.ip = new InsertionPoint(
									PlacesUtils.getConcreteItemId(elt._placesNode), -1, 
									Ci.nsITreeView.DROP_ON, PlacesUtils.nodeIsTagQuery(elt._placesNode)
								);
								dropPoint.beforeIndex = eltIndex;
								dropPoint.folderElt = elt;
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
						ind.style.transform = "translateY(" + Math.round(translateY) + "px)";
						ind.style.MozMarginTop = (-ind.clientHeight) + "px";
						ind.collapsed = false;
						this._clearOverFolder();
					}
					aEvent.preventDefault();
					aEvent.stopPropagation();
				};
				// --- patch end
			}
			// change the position to open menupopup after customization
			var popups = document.querySelectorAll("#" + elt.id + " > toolbarbutton > menupopup");
			for (let popup of popups) {
				popup.setAttribute("position", placement == 0 ? "end_before" : "start_before");
			}
		}
		if (this._austrails) {
			var unifiedButtons = this.toolbox.firstChild.querySelectorAll("toolbaritem > toolbarbutton");
			for (var button of unifiedButtons) {
				let func = aCustomizing ? "remove" : "add";
				button.classList[func]("toolbarbutton-1");
				button.classList[func]("chromeclass-toolbar-additional");
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
				// note that window.fullScreen is still false when entering fullscreen mode
				this.loadPrefs(!window.fullScreen);
				break;
			case "resize": 
				if (!this._autohide)
					return;
				// [autohide] adjust toolbar height
				var height = this.toolbox.parentNode.boxObject.height;
				this.toolbox.firstChild.style.height = height.toString() + "px";
				break;
			case "customizationstarting": 	// [Firefox28+]
			case "beforecustomization": 	// [Firefox27-]
				this.loadPrefs(false, true);
				document.getElementById("verticaltoolbar-context-menu").setAttribute("disabled", "true");
				// temporarily move the toolbar inside navigator-toolbox
				if (this._austrails) {
					var toolbar = document.getElementById(this.kToolbarId);
					gNavToolbox.appendChild(toolbar);
					toolbar.setAttribute("orient", "horizontal");
					toolbar.setAttribute("align", "center");
					toolbar.setAttribute("_mode", toolbar.getAttribute("mode"));
					toolbar.setAttribute("mode", "icons");
					var label = document.createElement("label");
					label.setAttribute("value", "Vertical Toolbar:");
					toolbar.insertBefore(label, toolbar.firstChild);
				}
				break;
			case "aftercustomization": 
				// restore the original position of the toolbar
				if (this._austrails) {
					var toolbar = document.getElementById(this.kToolbarId);
					toolbar.setAttribute("orient", "vertical");
					toolbar.removeAttribute("align");
					toolbar.removeChild(toolbar.querySelector("label"));
					toolbar.setAttribute("mode", toolbar.getAttribute("_mode"));
					toolbar.removeAttribute("_mode");
					this.toolbox.appendChild(toolbar);
				}
				this.loadPrefs(false);
				document.getElementById("verticaltoolbar-context-menu").removeAttribute("disabled");
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


// [Firefox28+] register the toolbar as a customizable area
if ("CustomizableUI" in window)
	VerticalToolbar.registerArea();
window.addEventListener("load", function() { VerticalToolbar.init(); }, false);
window.addEventListener("unload", function() { VerticalToolbar.uninit(); }, false);

