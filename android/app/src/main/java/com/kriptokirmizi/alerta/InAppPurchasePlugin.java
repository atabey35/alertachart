package com.kriptokirmizi.alerta;

import android.app.Activity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.android.billingclient.api.*;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@CapacitorPlugin(name = "InAppPurchase")
public class InAppPurchasePlugin extends Plugin implements PurchasesUpdatedListener, BillingClientStateListener {
    
    private BillingClient billingClient;
    private boolean isServiceConnected = false;
    private PluginCall pendingPurchaseCall = null;
    
    @Override
    public void load() {
        super.load();
        android.util.Log.d("InAppPurchase", "[PLUGIN] load() called - Plugin is loading");
        
        // Initialize Google Play Billing
        android.util.Log.d("InAppPurchase", "[PLUGIN] Creating BillingClient...");
        billingClient = BillingClient.newBuilder(getContext())
            .setListener(this)
            .enablePendingPurchases()
            .build();
        
        // Start connection
        android.util.Log.d("InAppPurchase", "[PLUGIN] Starting billing service connection...");
        billingClient.startConnection(this);
    }
    
    @PluginMethod
    public void logDebug(PluginCall call) {
        String message = call.getString("message");
        if (message != null) {
            android.util.Log.d("InAppPurchase", "[JS_LOG] " + message);
        }
        call.resolve();
    }
    
    @PluginMethod
    public void initialize(PluginCall call) {
        android.util.Log.d("InAppPurchase", "[INITIALIZE] Called");
        android.util.Log.d("InAppPurchase", "[INITIALIZE] billingClient: " + (billingClient != null ? "exists" : "null"));
        android.util.Log.d("InAppPurchase", "[INITIALIZE] isServiceConnected: " + isServiceConnected);
        
        if (billingClient != null && isServiceConnected) {
            android.util.Log.d("InAppPurchase", "[INITIALIZE] ✅ Resolving - service is connected");
            call.resolve();
        } else {
            android.util.Log.e("InAppPurchase", "[INITIALIZE] ❌ Rejecting - service not connected");
            call.reject("Billing service not connected. billingClient: " + (billingClient != null) + ", isServiceConnected: " + isServiceConnected);
        }
    }
    
    @PluginMethod
    public void getProducts(PluginCall call) {
        try {
            org.json.JSONArray productIdsArray = call.getArray("productIds");
            if (productIdsArray == null) {
                call.reject("productIds array is required");
                return;
            }
            
            if (!isServiceConnected) {
                call.reject("Billing service not connected");
                return;
            }
            
            // Build product list for Billing Library 7.x
            List<QueryProductDetailsParams.Product> productList = new ArrayList<>();
            for (int i = 0; i < productIdsArray.length(); i++) {
                String productId = productIdsArray.getString(i);
                productList.add(
                    QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(productId)
                        .setProductType(BillingClient.ProductType.SUBS)
                        .build()
                );
            }
            
            QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(productList)
                .build();
            
            billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsList) -> {
                int responseCode = billingResult.getResponseCode();
                String debugMessage = billingResult.getDebugMessage();
                
                android.util.Log.d("InAppPurchase", "[GET_PRODUCTS] queryProductDetailsAsync responseCode: " + responseCode + ", message: " + debugMessage);
                
                if (responseCode == BillingClient.BillingResponseCode.OK && productDetailsList != null) {
                    android.util.Log.d("InAppPurchase", "[GET_PRODUCTS] ✅ Found " + productDetailsList.size() + " products");
                    
                    JSObject result = new JSObject();
                    org.json.JSONArray productsArray = new org.json.JSONArray();
                    
                    for (ProductDetails productDetails : productDetailsList) {
                        android.util.Log.d("InAppPurchase", "[GET_PRODUCTS] Product: " + productDetails.getProductId());
                        
                        // Get subscription offer details (7.x API)
                        List<ProductDetails.SubscriptionOfferDetails> offersList = productDetails.getSubscriptionOfferDetails();
                        if (offersList != null && !offersList.isEmpty()) {
                            ProductDetails.SubscriptionOfferDetails offer = offersList.get(0);
                            List<ProductDetails.PricingPhase> pricingPhases = offer.getPricingPhases().getPricingPhaseList();
                            
                            if (!pricingPhases.isEmpty()) {
                                ProductDetails.PricingPhase pricingPhase = pricingPhases.get(0);
                                
                                JSObject product = new JSObject();
                                product.put("productId", productDetails.getProductId());
                                product.put("price", pricingPhase.getFormattedPrice());
                                product.put("currency", pricingPhase.getPriceCurrencyCode());
                                product.put("title", productDetails.getTitle());
                                product.put("description", productDetails.getDescription());
                                productsArray.put(product);
                                
                                android.util.Log.d("InAppPurchase", "[GET_PRODUCTS] Price: " + pricingPhase.getFormattedPrice());
                            }
                        }
                    }
                    
                    if (productDetailsList.isEmpty()) {
                        android.util.Log.w("InAppPurchase", "[GET_PRODUCTS] ⚠️ Product list is empty! Check:");
                        android.util.Log.w("InAppPurchase", "[GET_PRODUCTS] 1. Product IDs match Play Console");
                        android.util.Log.w("InAppPurchase", "[GET_PRODUCTS] 2. Products are active");
                        android.util.Log.w("InAppPurchase", "[GET_PRODUCTS] 3. App installed from Play Store");
                    }
                    
                    result.put("products", productsArray);
                    call.resolve(result);
                } else {
                    android.util.Log.e("InAppPurchase", "[GET_PRODUCTS] ❌ Failed to query products: " + debugMessage + " (code: " + responseCode + ")");
                    call.reject("Failed to query products: " + debugMessage + " (code: " + responseCode + ")");
                }
            });
        } catch (Exception e) {
            call.reject("Error parsing productIds: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void purchase(PluginCall call) {
        String productId = call.getString("productId");
        
        android.util.Log.d("InAppPurchase", "[PURCHASE] Starting purchase for productId: " + productId);
        
        if (productId == null || productId.isEmpty()) {
            android.util.Log.e("InAppPurchase", "[PURCHASE] ❌ productId is null or empty");
            call.reject("productId is required");
            return;
        }
        
        if (!isServiceConnected) {
            android.util.Log.e("InAppPurchase", "[PURCHASE] ❌ Billing service not connected");
            call.reject("Billing service not connected");
            return;
        }
        
        // Store call for later use in onPurchasesUpdated
        pendingPurchaseCall = call;
        
        // Query for the product (7.x API)
        List<QueryProductDetailsParams.Product> productList = Collections.singletonList(
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(productId)
                .setProductType(BillingClient.ProductType.SUBS)
                .build()
        );
        
        android.util.Log.d("InAppPurchase", "[PURCHASE] Querying product details for: " + productId);
        
        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
            .setProductList(productList)
            .build();
        
        billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsList) -> {
            int responseCode = billingResult.getResponseCode();
            String debugMessage = billingResult.getDebugMessage();
            
            android.util.Log.d("InAppPurchase", "[PURCHASE] queryProductDetailsAsync responseCode: " + responseCode + ", message: " + debugMessage);
            
            if (responseCode == BillingClient.BillingResponseCode.OK) {
                if (productDetailsList == null) {
                    android.util.Log.e("InAppPurchase", "[PURCHASE] ❌ productDetailsList is null");
                    if (pendingPurchaseCall != null) {
                        pendingPurchaseCall.reject("Product query returned null list");
                        pendingPurchaseCall = null;
                    }
                    return;
                }
                
                if (productDetailsList.isEmpty()) {
                    android.util.Log.e("InAppPurchase", "[PURCHASE] ❌ productDetailsList is empty - product not found: " + productId);
                    android.util.Log.e("InAppPurchase", "[PURCHASE] This usually means:");
                    android.util.Log.e("InAppPurchase", "[PURCHASE] 1. Product ID doesn't match Play Console");
                    android.util.Log.e("InAppPurchase", "[PURCHASE] 2. Product is not active in Play Console");
                    android.util.Log.e("InAppPurchase", "[PURCHASE] 3. App was not installed from Play Store");
                    android.util.Log.e("InAppPurchase", "[PURCHASE] 4. Wrong product type (SUBS vs INAPP)");
                    if (pendingPurchaseCall != null) {
                        pendingPurchaseCall.reject("Product not found: " + productId + ". Check Play Console settings.");
                        pendingPurchaseCall = null;
                    }
                    return;
                }
                
                ProductDetails productDetails = productDetailsList.get(0);
                android.util.Log.d("InAppPurchase", "[PURCHASE] ✅ Product found: " + productDetails.getProductId());
                
                // Get the subscription offer token (7.x API requirement)
                // Prefer base plan offer (usually the first one) which includes free trial
                List<ProductDetails.SubscriptionOfferDetails> offersList = productDetails.getSubscriptionOfferDetails();
                if (offersList == null || offersList.isEmpty()) {
                    android.util.Log.e("InAppPurchase", "[PURCHASE] ❌ No subscription offers found");
                    if (pendingPurchaseCall != null) {
                        pendingPurchaseCall.reject("No subscription offers available for: " + productId);
                        pendingPurchaseCall = null;
                    }
                    return;
                }
                
                // Log all offers for debugging
                for (int i = 0; i < offersList.size(); i++) {
                    ProductDetails.SubscriptionOfferDetails offer = offersList.get(i);
                    List<ProductDetails.PricingPhase> phases = offer.getPricingPhases().getPricingPhaseList();
                    android.util.Log.d("InAppPurchase", "[PURCHASE] Offer " + i + " has " + phases.size() + " pricing phases");
                    for (ProductDetails.PricingPhase phase : phases) {
                        android.util.Log.d("InAppPurchase", "[PURCHASE] Phase: " + phase.getPriceAmountMicros() + " " + phase.getPriceCurrencyCode() + " / " + phase.getBillingPeriod());
                    }
                }
                
                // Use base plan offer (first offer) - this should include free trial if configured
                String offerToken = offersList.get(0).getOfferToken();
                android.util.Log.d("InAppPurchase", "[PURCHASE] Using offer token: " + offerToken);
                
                List<BillingFlowParams.ProductDetailsParams> productDetailsParamsList = Collections.singletonList(
                    BillingFlowParams.ProductDetailsParams.newBuilder()
                        .setProductDetails(productDetails)
                        .setOfferToken(offerToken)
                        .build()
                );
                
                BillingFlowParams flowParams = BillingFlowParams.newBuilder()
                    .setProductDetailsParamsList(productDetailsParamsList)
                    .build();
                
                android.util.Log.d("InAppPurchase", "[PURCHASE] Launching billing flow...");
                BillingResult result = billingClient.launchBillingFlow(getActivity(), flowParams);
                
                int launchResponseCode = result.getResponseCode();
                String launchDebugMessage = result.getDebugMessage();
                
                android.util.Log.d("InAppPurchase", "[PURCHASE] launchBillingFlow responseCode: " + launchResponseCode + ", message: " + launchDebugMessage);
                
                if (launchResponseCode == BillingClient.BillingResponseCode.OK) {
                    android.util.Log.d("InAppPurchase", "[PURCHASE] ✅ Billing flow launched successfully - waiting for user response");
                    // Purchase result will be handled in onPurchasesUpdated
                } else if (launchResponseCode == BillingClient.BillingResponseCode.DEVELOPER_ERROR) {
                    android.util.Log.e("InAppPurchase", "[PURCHASE] ❌ DEVELOPER_ERROR - Usually means:");
                    android.util.Log.e("InAppPurchase", "[PURCHASE] - App not installed from Play Store");
                    android.util.Log.e("InAppPurchase", "[PURCHASE] - Wrong package name");
                    android.util.Log.e("InAppPurchase", "[PURCHASE] - Product not available in test track");
                    if (pendingPurchaseCall != null) {
                        pendingPurchaseCall.reject("DEVELOPER_ERROR: " + launchDebugMessage + ". Make sure app is installed from Play Store test track.");
                        pendingPurchaseCall = null;
                    }
                } else if (launchResponseCode == BillingClient.BillingResponseCode.ITEM_UNAVAILABLE) {
                    android.util.Log.e("InAppPurchase", "[PURCHASE] ❌ ITEM_UNAVAILABLE - Product not available");
                    if (pendingPurchaseCall != null) {
                        pendingPurchaseCall.reject("ITEM_UNAVAILABLE: " + launchDebugMessage);
                        pendingPurchaseCall = null;
                    }
                } else {
                    android.util.Log.e("InAppPurchase", "[PURCHASE] ❌ Failed to launch billing flow: " + launchResponseCode + " - " + launchDebugMessage);
                    if (pendingPurchaseCall != null) {
                        pendingPurchaseCall.reject("Failed to launch billing flow: " + launchDebugMessage + " (code: " + launchResponseCode + ")");
                        pendingPurchaseCall = null;
                    }
                }
            } else {
                android.util.Log.e("InAppPurchase", "[PURCHASE] ❌ queryProductDetailsAsync failed: " + responseCode + " - " + debugMessage);
                if (pendingPurchaseCall != null) {
                    pendingPurchaseCall.reject("Failed to query product: " + debugMessage + " (code: " + responseCode + ")");
                    pendingPurchaseCall = null;
                }
            }
        });
    }
    
    @PluginMethod
    public void restorePurchases(PluginCall call) {
        if (!isServiceConnected) {
            call.reject("Billing service not connected");
            return;
        }
        
        billingClient.queryPurchasesAsync(
            QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.SUBS)
                .build(),
            (billingResult, purchasesList) -> {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    JSObject result = new JSObject();
                    org.json.JSONArray transactionsArray = new org.json.JSONArray();
                    
                    for (Purchase purchase : purchasesList) {
                        JSObject transaction = new JSObject();
                        transaction.put("transactionId", purchase.getOrderId());
                        // 7.x API: getProducts() returns List<String>
                        List<String> products = purchase.getProducts();
                        if (!products.isEmpty()) {
                            transaction.put("productId", products.get(0));
                        }
                        transaction.put("receipt", purchase.getPurchaseToken());
                        transactionsArray.put(transaction);
                    }
                    
                    result.put("transactions", transactionsArray);
                    call.resolve(result);
                } else {
                    call.reject("Failed to restore purchases: " + billingResult.getDebugMessage());
                }
            }
        );
    }
    
    // BillingClientStateListener
    @Override
    public void onBillingSetupFinished(BillingResult billingResult) {
        int responseCode = billingResult.getResponseCode();
        String debugMessage = billingResult.getDebugMessage();
        
        android.util.Log.d("InAppPurchase", "[BILLING_SETUP] onBillingSetupFinished called");
        android.util.Log.d("InAppPurchase", "[BILLING_SETUP] responseCode: " + responseCode);
        android.util.Log.d("InAppPurchase", "[BILLING_SETUP] debugMessage: " + debugMessage);
        
        if (responseCode == BillingClient.BillingResponseCode.OK) {
            isServiceConnected = true;
            android.util.Log.d("InAppPurchase", "[BILLING_SETUP] ✅ Billing service connected");
        } else {
            isServiceConnected = false;
            android.util.Log.e("InAppPurchase", "[BILLING_SETUP] ❌ Billing setup failed: " + debugMessage + " (code: " + responseCode + ")");
        }
    }
    
    @Override
    public void onBillingServiceDisconnected() {
        isServiceConnected = false;
        android.util.Log.w("InAppPurchase", "⚠️ Billing service disconnected");
        // Reconnect
        billingClient.startConnection(this);
    }
    
    // PurchasesUpdatedListener
    @Override
    public void onPurchasesUpdated(BillingResult billingResult, List<Purchase> purchases) {
        int responseCode = billingResult.getResponseCode();
        String debugMessage = billingResult.getDebugMessage();
        
        android.util.Log.d("InAppPurchase", "[PURCHASE_UPDATE] responseCode: " + responseCode + ", message: " + debugMessage);
        android.util.Log.d("InAppPurchase", "[PURCHASE_UPDATE] purchases count: " + (purchases != null ? purchases.size() : 0));
        
        if (responseCode == BillingClient.BillingResponseCode.OK && purchases != null) {
            android.util.Log.d("InAppPurchase", "[PURCHASE_UPDATE] ✅ Purchase successful");
            for (Purchase purchase : purchases) {
                // 7.x API: getProducts() returns List<String>
                List<String> products = purchase.getProducts();
                if (!products.isEmpty()) {
                    android.util.Log.d("InAppPurchase", "[PURCHASE_UPDATE] Processing purchase: " + products.get(0));
                }
                handlePurchase(purchase);
            }
        } else if (responseCode == BillingClient.BillingResponseCode.USER_CANCELED) {
            android.util.Log.d("InAppPurchase", "[PURCHASE_UPDATE] ⚠️ User canceled purchase");
            if (pendingPurchaseCall != null) {
                pendingPurchaseCall.reject("User canceled purchase");
                pendingPurchaseCall = null;
            }
        } else {
            android.util.Log.e("InAppPurchase", "[PURCHASE_UPDATE] ❌ Purchase failed: " + debugMessage + " (code: " + responseCode + ")");
            if (pendingPurchaseCall != null) {
                pendingPurchaseCall.reject("Purchase failed: " + debugMessage + " (code: " + responseCode + ")");
                pendingPurchaseCall = null;
            }
        }
    }
    
    private void handlePurchase(Purchase purchase) {
        if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
            // Acknowledge purchase
            if (!purchase.isAcknowledged()) {
                AcknowledgePurchaseParams acknowledgeParams = AcknowledgePurchaseParams.newBuilder()
                    .setPurchaseToken(purchase.getPurchaseToken())
                    .build();
                
                billingClient.acknowledgePurchase(acknowledgeParams, (billingResult) -> {
                    if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                        android.util.Log.d("InAppPurchase", "✅ Purchase acknowledged");
                        
                        // Resolve pending call
                        if (pendingPurchaseCall != null) {
                            JSObject result = new JSObject();
                            result.put("transactionId", purchase.getOrderId());
                            // 7.x API: getProducts() returns List<String>
                            List<String> products = purchase.getProducts();
                            if (!products.isEmpty()) {
                                result.put("productId", products.get(0));
                            }
                            result.put("receipt", purchase.getPurchaseToken());
                            result.put("transactionReceipt", purchase.getOriginalJson());
                            
                            pendingPurchaseCall.resolve(result);
                            pendingPurchaseCall = null;
                        }
                    } else {
                        android.util.Log.e("InAppPurchase", "Failed to acknowledge purchase");
                        if (pendingPurchaseCall != null) {
                            pendingPurchaseCall.reject("Failed to acknowledge purchase");
                            pendingPurchaseCall = null;
                        }
                    }
                });
            } else {
                // Already acknowledged, resolve immediately
                if (pendingPurchaseCall != null) {
                    JSObject result = new JSObject();
                    result.put("transactionId", purchase.getOrderId());
                    // 7.x API: getProducts() returns List<String>
                    List<String> products = purchase.getProducts();
                    if (!products.isEmpty()) {
                        result.put("productId", products.get(0));
                    }
                    result.put("receipt", purchase.getPurchaseToken());
                    result.put("transactionReceipt", purchase.getOriginalJson());
                    
                    pendingPurchaseCall.resolve(result);
                    pendingPurchaseCall = null;
                }
            }
        }
    }
}
