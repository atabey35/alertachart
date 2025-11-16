import UIKit
import Capacitor
import FirebaseCore
import FirebaseMessaging
import UserNotifications
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate, MessagingDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Capacitor 7 uses automatic plugin discovery via packageClassList
        // WebViewController is registered automatically if it's in capacitor.config.json
        print("[AppDelegate] ✅ Application launching - plugins will be auto-discovered")
        
        // 🔥 Firebase initialization for push notifications
        // GoogleService-Info.plist must be added to the project
        FirebaseApp.configure()
        print("[AppDelegate] ✅ Firebase initialized")
        
        // 🔥 CRITICAL: Configure cookie persistence for session restore
        // This ensures cookies (including auth tokens) persist across app restarts
        HTTPCookieStorage.shared.cookieAcceptPolicy = .always
        print("[AppDelegate] ✅ Cookie persistence configured (HTTPCookieStorage)")
        
        // 🔥 CRITICAL: Setup push notifications
        setupPushNotifications(application: application)
        
        return true
    }
    
    // MARK: - Push Notifications Setup
    private func setupPushNotifications(application: UIApplication) {
        print("[AppDelegate] 🔔 Setting up push notifications...")
        
        // Set UNUserNotificationCenter delegate
        UNUserNotificationCenter.current().delegate = self
        
        // Set Firebase Messaging delegate
        Messaging.messaging().delegate = self
        
        // Request notification permissions
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            if let error = error {
                print("[AppDelegate] ❌ Notification permission error: \(error.localizedDescription)")
                return
            }
            
            if granted {
                print("[AppDelegate] ✅ Notification permission granted")
                DispatchQueue.main.async {
                    application.registerForRemoteNotifications()
                }
            } else {
                print("[AppDelegate] ⚠️ Notification permission denied")
            }
        }
        
        print("[AppDelegate] ✅ Push notifications setup complete")
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
        print("[AppDelegate] ⬇️ Application did enter background - app is going to background")
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
        print("[AppDelegate] 🔄 Application will enter foreground - app is reopening")
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
        print("[AppDelegate] ✅ Application did become active - app is now active")
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
        print("[AppDelegate] 🔴 Application will terminate - app is being killed")
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
    
    // MARK: - Remote Notifications (APNs)
    
    /// Called when APNs successfully assigns a device token
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        print("[AppDelegate] ✅ APNs device token received")
        
        // Convert device token to string for logging
        let tokenParts = deviceToken.map { data in String(format: "%02.2hhx", data) }
        let token = tokenParts.joined()
        print("[AppDelegate] 📱 APNs Token: \(token)")
        
        // 🔥 CRITICAL: Pass APNs token to Firebase Messaging
        // Firebase will use this to generate FCM token
        Messaging.messaging().apnsToken = deviceToken
        print("[AppDelegate] ✅ APNs token set to Firebase Messaging")
    }
    
    /// Called when APNs fails to register device token
    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("[AppDelegate] ❌ Failed to register for remote notifications: \(error.localizedDescription)")
        
        // Check if it's the aps-environment error (development build without proper provisioning)
        if error.localizedDescription.contains("aps-environment") {
            print("[AppDelegate] ⚠️ aps-environment error: This is normal for development builds without proper provisioning profile")
            print("[AppDelegate] ℹ️ For production, ensure Push Notifications capability is enabled in Xcode")
        }
    }
    
    /// Called when a remote notification is received while app is in foreground
    func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable: Any], fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
        print("[AppDelegate] 📬 Remote notification received (foreground/background)")
        print("[AppDelegate] Notification data: \(userInfo)")
        
        // Pass notification to Firebase Messaging
        Messaging.messaging().appDidReceiveMessage(userInfo)
        
        completionHandler(.newData)
    }
    
    // MARK: - UNUserNotificationCenterDelegate
    
    /// Called when notification is received while app is in foreground
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        let userInfo = notification.request.content.userInfo
        print("[AppDelegate] 📬 Notification received in foreground: \(userInfo)")
        
        // Show notification even when app is in foreground (like Android)
        if #available(iOS 14.0, *) {
            completionHandler([.banner, .sound, .badge])
        } else {
            completionHandler([.alert, .sound, .badge])
        }
    }
    
    /// Called when user taps on notification
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        let userInfo = response.notification.request.content.userInfo
        print("[AppDelegate] 👆 Notification tapped: \(userInfo)")
        
        // Handle notification tap (navigate to specific screen, etc.)
        if let notificationData = userInfo as? [String: Any] {
            handleNotificationTap(data: notificationData)
        }
        
        completionHandler()
    }
    
    // MARK: - Firebase Messaging Delegate
    
    /// Called when FCM token is received/refreshed
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        print("[AppDelegate] 🔔 FCM Registration token received")
        
        guard let fcmToken = fcmToken else {
            print("[AppDelegate] ❌ FCM token is nil")
            return
        }
        
        print("[AppDelegate] ✅ FCM Token: \(fcmToken)")
        
        // 🔥 CRITICAL: Send FCM token to JavaScript via Capacitor Bridge
        // This ensures the token is received by the Settings page even if Capacitor PushNotifications plugin doesn't fire
        sendFCMTokenToJavaScript(token: fcmToken)
        
        // Token is automatically handled by Capacitor PushNotifications plugin
        // This is just for logging/debugging
        let dataDict: [String: String] = ["token": fcmToken]
        NotificationCenter.default.post(name: Notification.Name("FCMToken"), object: nil, userInfo: dataDict)
    }
    
    /// Send FCM token to JavaScript via Capacitor Bridge
    private func sendFCMTokenToJavaScript(token: String) {
        // Escape token for JavaScript (handle quotes and special characters)
        let escapedToken = token.replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
            .replacingOccurrences(of: "\"", with: "\\\"")
            .replacingOccurrences(of: "\n", with: "\\n")
            .replacingOccurrences(of: "\r", with: "\\r")
        
        // JavaScript code to dispatch a custom event with the FCM token
        // This will be caught by the Settings page listener
        let jsCode = """
            (function() {
                try {
                    console.log('[AppDelegate] 🔔 Attempting to send FCM token to JavaScript...');
                    console.log('[AppDelegate] Token length: \(token.count)');
                    
                    var token = '\(escapedToken)';
                    
                    // Store token in window for later retrieval (fallback)
                    if (typeof window !== 'undefined') {
                        window.__fcmTokenFromAppDelegate = token;
                        console.log('[AppDelegate] ✅ Token stored in window.__fcmTokenFromAppDelegate');
                    }
                    
                    // Dispatch custom event that Settings page can listen to
                    if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
                        try {
                            const event = new CustomEvent('fcmTokenReceived', {
                                detail: { token: token }
                            });
                            window.dispatchEvent(event);
                            console.log('[AppDelegate] ✅ CustomEvent dispatched: fcmTokenReceived');
                        } catch (e) {
                            console.error('[AppDelegate] ❌ Error dispatching event:', e);
                        }
                    } else {
                        console.warn('[AppDelegate] ⚠️ window or CustomEvent not available');
                    }
                    
                    // Also store in localStorage as fallback
                    if (typeof localStorage !== 'undefined') {
                        try {
                            localStorage.setItem('fcm_token_from_appdelegate', token);
                            console.log('[AppDelegate] ✅ Token stored in localStorage as fallback');
                            console.log('[AppDelegate] ✅ localStorage.getItem check:', localStorage.getItem('fcm_token_from_appdelegate') ? 'found' : 'not found');
                        } catch (e) {
                            console.warn('[AppDelegate] ⚠️ Could not store token in localStorage:', e);
                        }
                    } else {
                        console.warn('[AppDelegate] ⚠️ localStorage not available');
                    }
                    
                    return { success: true, tokenLength: token.length };
                } catch (error) {
                    console.error('[AppDelegate] ❌ Error sending FCM token to JavaScript:', error);
                    return { success: false, error: error.message };
                }
            })();
        """
        
        // Get the main window and find the Capacitor bridge
        // Retry mechanism: Try multiple times with delays
        var retryCount = 0
        let maxRetries = 5
        let retryDelay: TimeInterval = 1.0
        
        func attemptSend() {
            DispatchQueue.main.async {
                guard let window = UIApplication.shared.windows.first(where: { $0.isKeyWindow }) ?? UIApplication.shared.windows.first else {
                    if retryCount < maxRetries {
                        retryCount += 1
                        print("[AppDelegate] ⚠️ No window available, retrying in \(retryDelay)s (attempt \(retryCount)/\(maxRetries))")
                        DispatchQueue.main.asyncAfter(deadline: .now() + retryDelay) {
                            attemptSend()
                        }
                    } else {
                        print("[AppDelegate] ❌ Failed to send FCM token after \(maxRetries) attempts")
                    }
                    return
                }
                
                // Try to find the WebView through the view hierarchy
                var webView: WKWebView? = nil
                
                if let bridgeViewController = window.rootViewController as? CAPBridgeViewController {
                    webView = bridgeViewController.webView
                } else {
                    webView = self.findWebView(in: window)
                }
                
                if let webView = webView {
                    // Check if WebView is ready
                    let checkReadyCode = "document.readyState === 'complete' || document.readyState === 'interactive'"
                    webView.evaluateJavaScript(checkReadyCode) { (result, error) in
                        let isReady = (result as? Bool) ?? false
                        
                        if isReady {
                            // WebView is ready, send token
                            // Also check if window and document are available
                            let checkWindowCode = "typeof window !== 'undefined' && typeof document !== 'undefined' && typeof CustomEvent !== 'undefined'"
                            webView.evaluateJavaScript(checkWindowCode) { (windowResult, windowError) in
                                let hasWindow = (windowResult as? Bool) ?? false
                                
                                if hasWindow {
                                    // Window is available, send token
                                    webView.evaluateJavaScript(jsCode) { (result, error) in
                                        if let error = error {
                                            print("[AppDelegate] ❌ Error executing JavaScript for FCM token: \(error.localizedDescription)")
                                            if retryCount < maxRetries {
                                                retryCount += 1
                                                DispatchQueue.main.asyncAfter(deadline: .now() + retryDelay) {
                                                    attemptSend()
                                                }
                                            }
                                        } else {
                                            print("[AppDelegate] ✅ FCM Token sent to JavaScript successfully")
                                            // Verify token was stored
                                            let verifyCode = "localStorage.getItem('fcm_token_from_appdelegate') || window.__fcmTokenFromAppDelegate || 'not found'"
                                            webView.evaluateJavaScript(verifyCode) { (verifyResult, _) in
                                                if let verifyStr = verifyResult as? String, verifyStr != "not found" {
                                                    print("[AppDelegate] ✅ FCM Token verified in storage: \(verifyStr.prefix(50))...")
                                                } else {
                                                    print("[AppDelegate] ⚠️ FCM Token not found in storage after sending")
                                                }
                                            }
                                        }
                                    }
                                } else {
                                    // Window not available, retry
                                    if retryCount < maxRetries {
                                        retryCount += 1
                                        print("[AppDelegate] ⚠️ Window not available, retrying in \(retryDelay)s (attempt \(retryCount)/\(maxRetries))")
                                        DispatchQueue.main.asyncAfter(deadline: .now() + retryDelay) {
                                            attemptSend()
                                        }
                                    }
                                }
                            }
                        } else {
                            // WebView not ready, retry
                            if retryCount < maxRetries {
                                retryCount += 1
                                print("[AppDelegate] ⚠️ WebView not ready, retrying in \(retryDelay)s (attempt \(retryCount)/\(maxRetries))")
                                DispatchQueue.main.asyncAfter(deadline: .now() + retryDelay) {
                                    attemptSend()
                                }
                            } else {
                                print("[AppDelegate] ❌ WebView not ready after \(maxRetries) attempts, sending anyway...")
                                webView.evaluateJavaScript(jsCode) { (result, error) in
                                    if let error = error {
                                        print("[AppDelegate] ❌ Error executing JavaScript for FCM token: \(error.localizedDescription)")
                                    } else {
                                        print("[AppDelegate] ✅ FCM Token sent to JavaScript successfully (WebView not ready but sent anyway)")
                                    }
                                }
                            }
                        }
                    }
                } else {
                    // WebView not found, retry
                    if retryCount < maxRetries {
                        retryCount += 1
                        print("[AppDelegate] ⚠️ WebView not found, retrying in \(retryDelay)s (attempt \(retryCount)/\(maxRetries))")
                        DispatchQueue.main.asyncAfter(deadline: .now() + retryDelay) {
                            attemptSend()
                        }
                    } else {
                        print("[AppDelegate] ❌ Could not find WebView after \(maxRetries) attempts")
                    }
                }
            }
        }
        
        // Start first attempt
        attemptSend()
    }
    
    /// Find WebView in view hierarchy
    private func findWebView(in view: UIView) -> WKWebView? {
        if let webView = view as? WKWebView {
            return webView
        }
        
        for subview in view.subviews {
            if let webView = findWebView(in: subview) {
                return webView
            }
        }
        
        return nil
    }
    
    // MARK: - Notification Handling
    
    private func handleNotificationTap(data: [String: Any]) {
        // Handle different notification types (like Android MainActivity)
        if let type = data["type"] as? String {
            print("[AppDelegate] 📱 Handling notification type: \(type)")
            
            switch type {
            case "price_alert":
                if let symbol = data["symbol"] as? String {
                    print("[AppDelegate] 📈 Price alert for symbol: \(symbol)")
                    // Navigate to chart with symbol (handled by Capacitor plugin)
                }
            case "alarm":
                print("[AppDelegate] ⏰ Alarm notification")
                // Navigate to alarms (handled by Capacitor plugin)
            default:
                print("[AppDelegate] ℹ️ Unknown notification type: \(type)")
            }
        }
    }

}
