#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Define the plugin using the Capacitor plugin macro
CAP_PLUGIN(WebViewController, "WebViewController",
    CAP_PLUGIN_METHOD(open, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(loadUrl, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(reload, CAPPluginReturnPromise);
)

