/**
 * Detect the browser environment and set the user interface accordingly,
 * relying on the `DesktopInterfacePolicy` and the `MobileInterfacePolicy`.
 */
(function(osimis) {

    function UserAgentBasedInterfacePolicy() {
        var _this = this;

        // Create observable
        this.onUpdate = new osimis.Listener();

        // Select a policy based on user agent
        var userInterfacePolicy;
        var uaParser = new UAParser();
        // Mobile
        if (uaParser.getDevice().type === 'mobile') {
            userInterfacePolicy = new osimis.MobileInterfacePolicy();
        }
        // Desktop & tablet
        else {
            userInterfacePolicy = new osimis.DesktopInterfacePolicy();
        }

        // Set initial UI values
        this.enableLayoutTop = userInterfacePolicy.enableLayoutTop;
        this.enableLayoutTopLeft = userInterfacePolicy.enableLayoutTopLeft;
        this.enableLayoutTopRight = userInterfacePolicy.enableLayoutTopRight;
        this.enableToolbar = userInterfacePolicy.enableToolbar;
        this.enableLayoutLeft = userInterfacePolicy.enableLayoutLeft;
        this.enableLayoutLeftBottom = userInterfacePolicy.enableLayoutLeftBottom;
        this.enableLayoutLeftHandles = userInterfacePolicy.enableLayoutLeftHandles;
        this.enableLayoutRight = userInterfacePolicy.enableLayoutRight;
        this.enableLayoutRightHandles = userInterfacePolicy.enableLayoutRightHandles;
        this.enableNotice = userInterfacePolicy.enableNotice;
        this.noticeText = userInterfacePolicy.noticeText;

        // Listen to changes triggered by the user interface policy
        userInterfacePolicy.onUpdate(function() {
            _this.enableLayoutTop = userInterfacePolicy.enableLayoutTop;
            _this.enableLayoutTopLeft = userInterfacePolicy.enableLayoutTopLeft;
            _this.enableLayoutTopRight = userInterfacePolicy.enableLayoutTopRight;
            _this.enableToolbar = userInterfacePolicy.enableToolbar;
            _this.enableLayoutLeft = userInterfacePolicy.enableLayoutLeft;
            _this.enableLayoutLeftBottom = userInterfacePolicy.enableLayoutLeftBottom;
            _this.enableLayoutLeftHandles = userInterfacePolicy.enableLayoutLeftHandles;
            _this.enableLayoutRight = userInterfacePolicy.enableLayoutRight;
            _this.enableLayoutRightHandles = userInterfacePolicy.enableLayoutRightHandles;
            _this.enableNotice = userInterfacePolicy.enableNotice;
            _this.noticeText = userInterfacePolicy.noticeText;

            _this.onUpdate.trigger();
        });
    }

    UserAgentBasedInterfacePolicy.prototype.onUpdate = _.noop;

    osimis.UserAgentBasedInterfacePolicy = UserAgentBasedInterfacePolicy;

})(this.osimis || (this.osimis = {}));