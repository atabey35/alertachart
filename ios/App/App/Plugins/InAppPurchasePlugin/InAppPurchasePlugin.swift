import Foundation
import Capacitor
import StoreKit

@objc(InAppPurchasePlugin)
public class InAppPurchasePlugin: CAPPlugin, CAPBridgedPlugin {
    // 🔥 CRITICAL: Capacitor 7 requires CAPBridgedPlugin protocol
    public let identifier = "InAppPurchasePlugin"
    public let jsName = "InAppPurchase"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "initialize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "logDebug", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkEntitlements", returnType: CAPPluginReturnPromise)
    ]
    
    private var products: [String: SKProduct] = [:]
    
    @objc func initialize(_ call: CAPPluginCall) {
        // StoreKit is automatically available, no initialization needed
        call.resolve()
    }
    
    @objc func logDebug(_ call: CAPPluginCall) {
        guard let message = call.getString("message") else {
            call.reject("message is required")
            return
        }
        
        // Log to Xcode console
        print("[InAppPurchase] \(message)")
        
        call.resolve()
    }
    
    @objc func getProducts(_ call: CAPPluginCall) {
        guard let productIds = call.getArray("productIds") as? [String] else {
            call.reject("productIds array is required")
            return
        }
        
        let request = SKProductsRequest(productIdentifiers: Set(productIds))
        request.delegate = self
        
        // Store request to prevent deallocation
        objc_setAssociatedObject(self, "request", request, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
        
        request.start()
        
        // Store call for later use
        objc_setAssociatedObject(self, "getProductsCall", call, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
    }
    
    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId") else {
            call.reject("productId is required")
            return
        }
        
        guard let product = products[productId] else {
            call.reject("Product not found: \(productId)")
            return
        }
        
        let payment = SKPayment(product: product)
        SKPaymentQueue.default().add(payment)
        
        // Store call for later use
        objc_setAssociatedObject(self, "purchaseCall", call, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
    }
    
    @objc func restorePurchases(_ call: CAPPluginCall) {
        SKPaymentQueue.default().restoreCompletedTransactions()
        
        // Store call for later use
        objc_setAssociatedObject(self, "restoreCall", call, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
    }
    
    /**
     * Check Entitlements - Get current receipt for validation
     * This is called on app startup and when app comes to foreground
     * to sync premium status with App Store
     */
    @objc func checkEntitlements(_ call: CAPPluginCall) {
        print("[InAppPurchase] checkEntitlements: Checking current receipt...")
        
        guard let receiptURL = Bundle.main.appStoreReceiptURL else {
            print("[InAppPurchase] checkEntitlements: ⚠️ Receipt URL not found")
            call.resolve([
                "hasReceipt": false,
                "receipt": ""
            ] as PluginCallResultData)
            return
        }
        
        guard let receiptData = try? Data(contentsOf: receiptURL) else {
            print("[InAppPurchase] checkEntitlements: ⚠️ Could not read receipt data")
            call.resolve([
                "hasReceipt": false,
                "receipt": ""
            ] as PluginCallResultData)
            return
        }
        
        let receiptString = receiptData.base64EncodedString()
        print("[InAppPurchase] checkEntitlements: ✅ Receipt found (length: \(receiptString.count))")
        
        // Also check for pending transactions that might not be in receipt yet
        let pendingTransactions = SKPaymentQueue.default().transactions.filter { transaction in
            transaction.transactionState == .purchased || transaction.transactionState == .restored
        }
        
        var transactions: [[String: Any]] = []
        for transaction in pendingTransactions {
            transactions.append([
                "transactionId": transaction.transactionIdentifier ?? "",
                "productId": transaction.payment.productIdentifier,
                "state": transactionStateToString(transaction.transactionState)
            ])
        }
        
        call.resolve([
            "hasReceipt": true,
            "receipt": receiptString,
            "pendingTransactions": transactions
        ] as PluginCallResultData)
    }
    
    private func transactionStateToString(_ state: SKPaymentTransactionState) -> String {
        switch state {
        case .purchasing: return "purchasing"
        case .purchased: return "purchased"
        case .failed: return "failed"
        case .restored: return "restored"
        case .deferred: return "deferred"
        @unknown default: return "unknown"
        }
    }
    
    public override func load() {
        super.load()
        
        // Add payment queue observer
        SKPaymentQueue.default().add(self)
    }
    
    deinit {
        SKPaymentQueue.default().remove(self)
    }
}

extension InAppPurchasePlugin: SKProductsRequestDelegate {
    public func productsRequest(_ request: SKProductsRequest, didReceive response: SKProductsResponse) {
        var productsArray: [[String: Any]] = []
        
        for product in response.products {
            self.products[product.productIdentifier] = product
            
            let productDict: [String: Any] = [
                "productId": product.productIdentifier,
                "price": product.price.stringValue,
                "currency": product.priceLocale.currencyCode ?? "USD",
                "title": product.localizedTitle,
                "description": product.localizedDescription
            ]
            productsArray.append(productDict)
        }
        
        if let call = objc_getAssociatedObject(self, "getProductsCall") as? CAPPluginCall {
            let result = [
                "products": productsArray
            ]
            call.resolve(result as PluginCallResultData)
            objc_setAssociatedObject(self, "getProductsCall", nil, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
        }
        
        if response.invalidProductIdentifiers.count > 0 {
            print("[InAppPurchase] Invalid product IDs: \(response.invalidProductIdentifiers)")
        }
    }
    
    public func request(_ request: SKRequest, didFailWithError error: Error) {
        if let call = objc_getAssociatedObject(self, "getProductsCall") as? CAPPluginCall {
            call.reject("Failed to fetch products: \(error.localizedDescription)")
            objc_setAssociatedObject(self, "getProductsCall", nil, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
        }
    }
}

extension InAppPurchasePlugin: SKPaymentTransactionObserver {
    public func paymentQueue(_ queue: SKPaymentQueue, updatedTransactions transactions: [SKPaymentTransaction]) {
        for transaction in transactions {
            switch transaction.transactionState {
            case .purchased:
                handlePurchased(transaction)
            case .failed:
                handleFailed(transaction)
            case .restored:
                handleRestored(transaction)
            case .deferred:
                print("[InAppPurchase] Transaction deferred")
            case .purchasing:
                print("[InAppPurchase] Transaction purchasing...")
            @unknown default:
                break
            }
        }
    }
    
    private func handlePurchased(_ transaction: SKPaymentTransaction) {
        print("[InAppPurchase] handlePurchased: Transaction purchased - \(transaction.payment.productIdentifier)")
        
        guard let receiptURL = Bundle.main.appStoreReceiptURL,
              let receiptData = try? Data(contentsOf: receiptURL) else {
            print("[InAppPurchase] handlePurchased: ⚠️ Receipt not found")
            finishTransaction(transaction, success: false, error: "Receipt not found")
            return
        }
        
        let receiptString = receiptData.base64EncodedString()
        
        if let call = objc_getAssociatedObject(self, "purchaseCall") as? CAPPluginCall {
            let result: [String: Any] = [
                "transactionId": transaction.transactionIdentifier ?? "",
                "productId": transaction.payment.productIdentifier,
                "receipt": receiptString,
                "transactionReceipt": receiptString
            ]
            call.resolve(result as PluginCallResultData)
            objc_setAssociatedObject(self, "purchaseCall", nil, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
        }
        
        // 🔥 CRITICAL: Transaction completed - JavaScript will detect via periodic sync
        // The entitlement sync service will check for new transactions periodically
        finishTransaction(transaction, success: true)
    }
    
    private func handleFailed(_ transaction: SKPaymentTransaction) {
        if let error = transaction.error as? SKError {
            if error.code != .paymentCancelled {
                print("[InAppPurchase] Transaction failed: \(error.localizedDescription)")
            }
            
            if let call = objc_getAssociatedObject(self, "purchaseCall") as? CAPPluginCall {
                call.reject("Purchase failed: \(error.localizedDescription)")
                objc_setAssociatedObject(self, "purchaseCall", nil, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
            }
        }
        
        finishTransaction(transaction, success: false)
    }
    
    private func handleRestored(_ transaction: SKPaymentTransaction) {
        print("[InAppPurchase] handleRestored: Transaction restored - \(transaction.payment.productIdentifier)")
        
        guard let receiptURL = Bundle.main.appStoreReceiptURL,
              let receiptData = try? Data(contentsOf: receiptURL) else {
            print("[InAppPurchase] handleRestored: ⚠️ Receipt not found")
            finishTransaction(transaction, success: false)
            return
        }
        
        let receiptString = receiptData.base64EncodedString()
        
        // Store transaction info for restore completion
        if objc_getAssociatedObject(self, "restoredTransactions") == nil {
            objc_setAssociatedObject(self, "restoredTransactions", NSMutableArray(), .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
        }
        
        if let transactionsArray = objc_getAssociatedObject(self, "restoredTransactions") as? NSMutableArray {
            let transactionDict: [String: Any] = [
                "transactionId": transaction.transactionIdentifier ?? "",
                "productId": transaction.payment.productIdentifier,
                "receipt": receiptString
            ]
            transactionsArray.add(transactionDict)
        }
        
        // 🔥 CRITICAL: Transaction restored - JavaScript will detect via periodic sync
        // The entitlement sync service will check for new transactions periodically
        finishTransaction(transaction, success: true)
    }
    
    private func finishTransaction(_ transaction: SKPaymentTransaction, success: Bool, error: String? = nil) {
        SKPaymentQueue.default().finishTransaction(transaction)
    }
    
    public func paymentQueue(_ queue: SKPaymentQueue, restoreCompletedTransactionsFailedWithError error: Error) {
        if let call = objc_getAssociatedObject(self, "restoreCall") as? CAPPluginCall {
            call.reject("Restore failed: \(error.localizedDescription)")
            objc_setAssociatedObject(self, "restoreCall", nil, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
        }
    }
    
    public func paymentQueueRestoreCompletedTransactionsFinished(_ queue: SKPaymentQueue) {
        // All transactions restored
        print("[InAppPurchase] All transactions restored")
        
        if let call = objc_getAssociatedObject(self, "restoreCall") as? CAPPluginCall {
            if let transactionsArray = objc_getAssociatedObject(self, "restoredTransactions") as? NSMutableArray {
                let result: [String: Any] = [
                    "purchases": transactionsArray  // 🔥 CRITICAL: Changed from 'transactions' to 'purchases' to match Android and frontend expectations
                ]
                call.resolve(result as PluginCallResultData)
                objc_setAssociatedObject(self, "restoreCall", nil, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
                objc_setAssociatedObject(self, "restoredTransactions", nil, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
            } else {
                call.resolve(["purchases": []] as PluginCallResultData)  // 🔥 CRITICAL: Changed from 'transactions' to 'purchases'
                objc_setAssociatedObject(self, "restoreCall", nil, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
            }
        }
    }
}

