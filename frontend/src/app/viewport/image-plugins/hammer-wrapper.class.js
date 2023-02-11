(function(module) {

    var lastTouchPanningCenter = null;  // this is shared betwwen all HammerWrappers because the final event is often received by the oneTouch handler (i.e: when you release your twoTouch, you often release one finger after the other and the final event is issued by the oneTouch handler)
    var startTouchPanningCenter = null;
    var maxTouchCountInThisMove = 0;

    function HammerWrapper(enabledElement, touchCount, viewport, toolName, wvWindowingViewportTool, wvPanViewportTool) {
        var _this = this;
        this._touchCount = touchCount;
        this._viewport = viewport;
        this._toolName = toolName;

        this._hammer = new Hammer(enabledElement);

        this._hammer.get("pan").set({
            direction: Hammer.DIRECTION_ALL,
            pointers: touchCount
        });

        this._hammer.on("pan", function(ev) {
            if (ev.pointerType !== "touch"){
                return;
            }

            if (lastTouchPanningCenter === null){
                startTouchPanningCenter = ev.center;
                lastTouchPanningCenter = startTouchPanningCenter;
                // console.log("starting new touch", lastTouchPanningCenter.x, lastTouchPanningCenter.y);
                return;
            }

            _this._hammer.on("panend", function(ev) { // reset when pan is finished
                // console.log("clearing touch");
                maxTouchCountInThisMove = 0;
                lastTouchPanningCenter = null;
                startTouchPanningCenter = null;
            })

            if (_this._touchCount < maxTouchCountInThisMove) // we are releasing a twoTouch move one finger before the other -> don't apply the one touch action
                return;
            maxTouchCountInThisMove = Math.max(maxTouchCountInThisMove, _this._touchCount);

            // console.log("touch", ev.center.x, ev.center.y);
            var deltaX = ev.center.x - lastTouchPanningCenter.x;
            var deltaY = ev.center.y - lastTouchPanningCenter.y;
            var deltaFromStartX = ev.center.x - startTouchPanningCenter.x;
            var deltaFromStartX = ev.center.y - startTouchPanningCenter.y;

            if (_this._toolName === "windowing") {
                wvWindowingViewportTool.applyWindowingToViewport(_this._viewport, deltaX, deltaY, deltaFromStartX, deltaFromStartX, false);
            } else if (_this._toolName === "pan") {
                wvPanViewportTool.applyPanToViewport(_this._viewport, deltaX, deltaY);
            }

            lastTouchPanningCenter = ev.center;

            return;
        });

        this.destroy = function() {
            lastTouchPanningCenter = null;
            maxTouchCountInThisMove = null;
            this._hammer.destroy();
        }
    };


    module.HammerWrapper = HammerWrapper;

})(window.osi ? window.osi : (window.osi = {}));
