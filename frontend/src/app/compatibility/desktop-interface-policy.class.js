(function(osimis) {

    function DesktopInterfacePolicy() {
        var _this = this;
        
        // Create observable. Not used in this policy.
        this.onUpdate = new osimis.Listener();

        // Set initial UI values
        // 1. Always enable top side
        this.enableLayoutTop = true;
        this.enableLayoutTopLeft = true;
        this.enableLayoutTopRight = true;
        this.enableToolbar = true;
        // 2. Always enable left/right side
        this.enableLayoutLeft = true;
        this.enableLayoutLeftBottom = true;
        this.enableLayoutLeftHandles = true;
        this.enableLayoutRight = true;
        this.enableLayoutRightHandles = true;
        // 3. Never show notice
        this.enableNotice = false;
        this.noticeText = undefined;
    }

    DesktopInterfacePolicy.prototype.onUpdate = _.noop;

    osimis.DesktopInterfacePolicy = DesktopInterfacePolicy;

})(this.osimis || (this.osimis = {}));