package com.kriptokirmizi.alerta;

import android.app.Activity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.android.billingclient.api.*;
import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "InAppPurchase")
public class InAppPurchasePlugin extends Plugin implements PurchasesUpdatedListener, BillingClientStateListener {
    
    private BillingClient billingClient;
    private boolean isServiceConnected = false;
    private PluginCall pendingPurchaseCall = null;
    
    @Override
    public void load() {
        super.load();
        
        // Initialize Google Play Billing
        billingClient = BillingClient.newBuilder(getContext())
            .setListener(this)
            .enablePendingPurchases()
            .build();
        
        // Start connection
        billingClient.startConnection(this);
    }
    
    @PluginMethod
    public void initialize(PluginCall call) {
        if (billingClient != null && isServiceConnected) {
            call.resolve();
        } else {
            call.reject("Billing service not connected");
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
            
            List<String> skuList = new ArrayList<>();
            for (int i = 0; i < productIdsArray.length(); i++) {
                skuList.add(productIdsArray.getString(i));
            }
            
            SkuDetailsParams params = SkuDetailsParams.newBuilder()
                .setSkusList(skuList)
                .setType(BillingClient.SkuType.SUBS) // or INAPP for one-time purchases
                .build();
            
            billingClient.querySkuDetailsAsync(params, (billingResult, skuDetailsList) -> {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && skuDetailsList != null) {
                    JSObject result = new JSObject();
                    org.json.JSONArray productsArray = new org.json.JSONArray();
                    
                    for (SkuDetails skuDetails : skuDetailsList) {
                        JSObject product = new JSObject();
                        product.put("productId", skuDetails.getSku());
                        product.put("price", skuDetails.getPrice());
                        product.put("currency", skuDetails.getPriceCurrencyCode());
                        product.put("title", skuDetails.getTitle());
                        product.put("description", skuDetails.getDescription());
                        productsArray.put(product);
                    }
                    
                    result.put("products", productsArray);
                    call.resolve(result);
                } else {
                    call.reject("Failed to query products: " + billingResult.getDebugMessage());
                }
            });
        } catch (Exception e) {
            call.reject("Error parsing productIds: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void purchase(PluginCall call) {
        String productId = call.getString("productId");
        
        if (!isServiceConnected) {
            call.reject("Billing service not connected");
            return;
        }
        
        // Store call for later use in onPurchasesUpdated
        pendingPurchaseCall = call;
        
        // Query for the product
        List<String> skuList = new ArrayList<>();
        skuList.add(productId);
        
        SkuDetailsParams params = SkuDetailsParams.newBuilder()
            .setSkusList(skuList)
            .setType(BillingClient.SkuType.SUBS)
            .build();
        
        billingClient.querySkuDetailsAsync(params, (billingResult, skuDetailsList) -> {
            if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK 
                && skuDetailsList != null && !skuDetailsList.isEmpty()) {
                
                SkuDetails skuDetails = skuDetailsList.get(0);
                BillingFlowParams flowParams = BillingFlowParams.newBuilder()
                    .setSkuDetails(skuDetails)
                    .build();
                
                BillingResult result = billingClient.launchBillingFlow(getActivity(), flowParams);
                
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    if (pendingPurchaseCall != null) {
                        pendingPurchaseCall.reject("Failed to launch billing flow: " + result.getDebugMessage());
                        pendingPurchaseCall = null;
                    }
                }
                // Purchase result will be handled in onPurchasesUpdated
            } else {
                if (pendingPurchaseCall != null) {
                    pendingPurchaseCall.reject("Product not found: " + productId);
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
                .setProductType(BillingClient.SkuType.SUBS)
                .build(),
            (billingResult, purchasesList) -> {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    JSObject result = new JSObject();
                    org.json.JSONArray transactionsArray = new org.json.JSONArray();
                    
                    for (Purchase purchase : purchasesList) {
                        JSObject transaction = new JSObject();
                        transaction.put("transactionId", purchase.getOrderId());
                        transaction.put("productId", purchase.getSkus().get(0));
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
        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
            isServiceConnected = true;
            android.util.Log.d("InAppPurchase", "✅ Billing service connected");
        } else {
            isServiceConnected = false;
            android.util.Log.e("InAppPurchase", "❌ Billing setup failed: " + billingResult.getDebugMessage());
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
        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
            for (Purchase purchase : purchases) {
                handlePurchase(purchase);
            }
        } else if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            android.util.Log.d("InAppPurchase", "User canceled purchase");
            if (pendingPurchaseCall != null) {
                pendingPurchaseCall.reject("User canceled purchase");
                pendingPurchaseCall = null;
            }
        } else {
            android.util.Log.e("InAppPurchase", "Purchase failed: " + billingResult.getDebugMessage());
            if (pendingPurchaseCall != null) {
                pendingPurchaseCall.reject("Purchase failed: " + billingResult.getDebugMessage());
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
                            result.put("productId", purchase.getSkus().get(0));
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
                    result.put("productId", purchase.getSkus().get(0));
                    result.put("receipt", purchase.getPurchaseToken());
                    result.put("transactionReceipt", purchase.getOriginalJson());
                    
                    pendingPurchaseCall.resolve(result);
                    pendingPurchaseCall = null;
                }
            }
        }
    }
}

