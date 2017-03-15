"use strict";

class PopupStack extends Widget {

    static get observedAttributes() {
        return ["disabled", "direction", "overlap", "animate",
                "slide-duration"];
    }

    constructor() {
        super("popup-stack", true);
        this.callback = (label, value) => { };
        this._attributes = {
            "animate": true,
            "disabled": false,
            "overlap": 0,
            "direction": "right",
            "slideDuration": 300,
            "easing": "ease-out"
        }
        this.isOpen = false;
        this.closing = false;
        this.topItem = null;
        this.usedEvents = new Set();
        window.addEventListener("click", (event) => {
            if (this.usedEvents.has(event)) {
                this.usedEvents.delete(event);
                return;
            }
            if (this._attributes["disabled"]) return;
            if (this.closing) return;
            this.close();
        });
        this.addEventListener("click", (event) => {
            if (event.target.parentNode !== this) return;
            if (this._attributes["disabled"]) return;
            if (this.closing) return;
            if (this.isOpen) {
                this.set(event.target);
                this.close();
            } else {
                this.open();
            }
            this.usedEvents.add(event);
        });
    }

    addOption(label, value) {
        const option = document.createElement("option");
        option.label = label;
        option.value = value === undefined ? label : value;
        this.appendChild(option);
        return option;
    }

    set(item) {
        if (this.topItem !== null) {
            const topItemIndex = this.childrenArray().indexOf(this.topItem);
            this.topItem.style.zIndex = topItemIndex;
            this.topItem.removeAttribute("selected");
        }
        this.topItem = item;
        this.topItem.setAttribute("selected", "");
        this.topItem.style.zIndex = this.children.length;
        this.callback(this.topItem.label, this.topItem.value);
    }

    setByIndex(index) {
        this.set(this.children[index]);
    }

    get value() {
        return this.topItem.value;
    }

    open() {
        if (this.isOpen || this.children.length === 0) return;
        this.isOpen = true;
        // Set names of the properties to be changed depending on direction
        let propertyNames;
        if (this._attributes["direction"] === "left" ||
                this._attributes["direction"] === "right") {
            propertyNames = {
                size: "offsetWidth", offset: "left", dimension: "width"
            };
        } else if (this._attributes["direction"] === "up" ||
                   this._attributes["direction"] === "down") {
            propertyNames = {
                size: "offsetHeight", offset: "top", dimension: "height"
            };
        }
        const sign = (this._attributes["direction"] === "up" ||
                      this._attributes["direction"] === "left") ? -1 : 1;
        // Open the popup-stack by animating/setting these property names
        const itemSize = this.children[0][propertyNames.size];
        let current = 0;
        for (let i = 0; i < this.children.length; ++i) {
            const child = this.children[i];
            child.style.zIndex = i;
            if (this._attributes["animate"]) {
                Velocity(child, { [propertyNames.offset] : `${current}px` }, {
                    duration: this._attributes["slideDuration"],
                    easing: this._attributes["easing"]
                });
            } else {
                child.style[propertyNames.offset] = `${current}px`;
            }
            current += sign * (itemSize - this._attributes["overlap"]);
        }
        // Also expand the shadow
        this.topItem.style.zIndex = this.children.length;
        if (this._attributes["animate"]) {
            return Velocity(this.$("shadow"), { 
                [propertyNames.dimension] : current
            }, {
                duration: this._attributes["slideDuration"],
                easing: this._attributes["easing"]
            });
        } else {
            this.$("shadow").style[propertyNames.dimension] = `${current}px`;
        }
    }

    close() {
        if (!this.isOpen) return;
        this.style.pointerEvents = "none";
        this.closing = true;
        this.isOpen = false;
        // Set names of the properties to be changed depending on direction
        let propertyNames;
        if (this._attributes["direction"] === "left" ||
                this._attributes["direction"] === "right") {
            propertyNames = {
                size: "offsetWidth", offset: "left", dimension: "width"
            };
        } else if (this._attributes["direction"] === "up" ||
                   this._attributes["direction"] === "down") {
            propertyNames = {
                size: "offsetHeight", offset: "top", dimension: "height"
            };
        }
        // Close the popup-stack by animating/setting these property names
        if (this._attributes["animate"]) {
            for (const child of this.children) {
                Velocity(child, "stop");
                Velocity(child, { [propertyNames.offset]: "0px" },
                    { duration: this._attributes["slideDuration"],
                      easing: this._attributes["easing"] });
            }
        } else {
            for (const child of this.children) {
                child.style[propertyNames.offset] = "0px";
            }
        }
        // Also shrink shadow again
        const closedSize = this.$("frame")[propertyNames.size];
        let promise = Promise.resolve();
        if (this._attributes["animate"]) {
            Velocity(this.$("shadow"), "stop");
            promise = Velocity(this.$("shadow"), {
                [propertyNames.dimension]: `${closedSize}px`
            }, {
                duration: this._attributes["slideDuration"],
                easing: this._attributes["easing"]
            });
        } else {
            this.$("shadow").style[propertyNames.dimension] = `${closedSize}px`;
        }
        return promise.then(() => {
            this.style.pointerEvents = "auto";
            this.closing = false;
        });
    }

    attributeChangedCallback(name, oldValue, newValue) {
        this.close();
        if (name === "disabled") {
            this._attributes["disabled"] = (newValue !== null);
            if (this.topItem !== null) {
                this.topItem.classList.toggle(
                    "disabled", this._attributes["disabled"]);
            }
        } else if (name === "direction") {
            if (newValue === "up" || newValue === "down" ||
                    newValue === "left" || newValue === "right") {
                this._attributes["direction"] = newValue;
            } else {
                throw new Error("'direction' attribute must be one of " +
                                "['up', 'down', 'left', 'right'].");
            }
        } else if (name === "overlap") {
            if (!isNaN(newValue)) {
                this._attributes["overlap"] = parseInt(newValue);
            } else {
                throw new Error("popup-stack overlap must be an integer.");
            }
        } else if (name === "animate") {
            this._attributes["animate"] = (newValue !== null);
        } else if (name === "slide-duration") {
            this._attributes["slideDuration"] = newValue;
        }
    }

    set disabled(value) {
        if (value) this.setAttribute("disabled", "");
        else this.removeAttribute("disabled");
    }

    get disabled() {
        return this.hasAttribute("disabled");
    }

    set direction(value) {
        this.setAttribute("direction", value);
    }

    get direction() {
        return this.getAttribute("direction");
    }

    set overlap(value) {
        this.setAttribute("overlap", value);
    }

    get overlap() {
        return this.getAttribute("overlap");
    }

    set animate(value) {
        if (value) this.setAttribute("animate", "");
        else this.removeAttribute("animate");
    }

    get animate() {
        return this.hasAttribute("animate");
    }

    set slideDuration(value) {
        this.setAttribute("slide-duration", value);
    }

    get slideDuration() {
        return this.getAttribute("slide-duration");
    }
}

customElements.define("popup-stack", PopupStack);
module.exports = PopupStack;
