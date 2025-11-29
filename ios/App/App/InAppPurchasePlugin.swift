import Foundation
import Capacitor
import StoreKit

@objc(InAppPurchasePlugin)
public class InAppPurchasePlugin: CAPPlugin {
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
        guard let receiptURL = Bundle.main.appStoreReceiptURL,
              let receiptData = try? Data(contentsOf: receiptURL) else {
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
        guard let receiptURL = Bundle.main.appStoreReceiptURL,
              let receiptData = try? Data(contentsOf: receiptURL) else {
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
                    "transactions": transactionsArray
                ]
                call.resolve(result as PluginCallResultData)
                objc_setAssociatedObject(self, "restoreCall", nil, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
                objc_setAssociatedObject(self, "restoredTransactions", nil, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
            } else {
                call.resolve(["transactions": []] as PluginCallResultData)
                objc_setAssociatedObject(self, "restoreCall", nil, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
            }
        }
    }
}

