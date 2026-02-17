/**
 * Copyright © 2016 Magento. All rights reserved.
 * See COPYING.txt for license details.
 */

/*browser:true*/
/*global define*/
define(
    [
        'Magento_Payment/js/view/payment/cc-form',
        'jquery',
        'knockout',
        'Magento_Checkout/js/action/place-order',
        'Magento_Customer/js/model/customer',
        'Magento_Checkout/js/model/full-screen-loader',
        'Magento_Checkout/js/model/error-processor',
        'Magento_Ui/js/model/messageList',
        'Magento_Checkout/js/model/quote',
        'Magento_Checkout/js/model/url-builder',
        'Magento_Checkout/js/model/payment/additional-validators',
        'Magento_Checkout/js/action/redirect-on-success',
        'ams',
        'Magento_Customer/js/customer-data',
        'mage/translate'
    ],
    function (
        Component,
        $,
        ko,
        placeOrderAction,
        customer,
        fullScreenLoader,
        errorProcessor,
        messageList,
        quote,
        urlBuilder,
        additionalValidators,
        redirectOnSuccessAction,
        AMS,
        customerData,
        $t
    ) {
        'use strict';

        const RESULT_CODE = {
            SUCCESS: 'SUCCESS',
            FAIL: 'FAIL'
        };

        const PAYMENT_STATUS = {
            PROCESSING: 'PROCESSING',
            PENDING: 'PENDING',
            FAIL: 'FAIL'
        };

        const ENV = {
            LIVE: 'live',
            TEST: 'test'
        };

        // 错误码常量定义
        const ERROR_CODES = {
            UNKNOWN_EXCEPTION: 'UNKNOWN_EXCEPTION',
            USER_BALANCE_NOT_ENOUGH: 'USER_BALANCE_NOT_ENOUGH',
            ORDER_NOT_EXIST: 'ORDER_NOT_EXIST',
            PROCESS_FAIL: 'PROCESS_FAIL',
            ORDER_IS_CANCELLED: 'ORDER_IS_CANCELLED',
            RISK_REJECT: 'RISK_REJECT',
            ORDER_IS_CLOSED: 'ORDER_IS_CLOSED',
            INQUIRY_PAYMENT_SESSION_FAILED: 'INQUIRY_PAYMENT_SESSION_FAILED',
            ACCESS_DENIED: 'ACCESS_DENIED',
            CARD_EXPIRED: 'CARD_EXPIRED',
            INVALID_EXPIRY_DATE_FORMAT: 'INVALID_EXPIRY_DATE_FORMAT',
            INVALID_EXPIRATION_DATE: 'INVALID_EXPIRATION_DATE',
            INVALID_CVV: 'INVALID_CVV',
            INVALID_CARD_NUMBER: 'INVALID_CARD_NUMBER',
            SELECTED_CARD_BRAND_NOT_AVAILABLE: 'SELECTED_CARD_BRAND_NOT_AVAILABLE',
            CARD_NOT_SUPPORTED: 'CARD_NOT_SUPPORTED',
            CARD_BIN_QUERY_ERROR: 'CARD_BIN_QUERY_ERROR',
            PAYMENT_IN_PROCESS: 'PAYMENT_IN_PROCESS',
            CURRENCY_NOT_SUPPORT: 'CURRENCY_NOT_SUPPORT',
            INVALID_CARD: 'INVALID_CARD',
            ISSUER_REJECTS_TRANSACTION: 'ISSUER_REJECTS_TRANSACTION',
            INVALID_MERCHANT_STATUS: 'INVALID_MERCHANT_STATUS',
            KEY_NOT_FOUND: 'KEY_NOT_FOUND',
            MERCHANT_KYB_NOT_QUALIFIED: 'MERCHANT_KYB_NOT_QUALIFIED',
            NO_PAY_OPTIONS: 'NO_PAY_OPTIONS',
            PARAM_ILLEGAL: 'PARAM_ILLEGAL',
            PAYMENT_AMOUNT_EXCEED_LIMIT: 'PAYMENT_AMOUNT_EXCEED_LIMIT',
            PAYMENT_COUNT_EXCEED_LIMIT: 'PAYMENT_COUNT_EXCEED_LIMIT',
            PAYMENT_NOT_QUALIFIED: 'PAYMENT_NOT_QUALIFIED',
            SUSPECTED_CARD: 'SUSPECTED_CARD',
            SYSTEM_ERROR: 'SYSTEM_ERROR',
            USER_AMOUNT_EXCEED_LIMIT: 'USER_AMOUNT_EXCEED_LIMIT',
            USER_KYC_NOT_QUALIFIED: 'USER_KYC_NOT_QUALIFIED',
            USER_PAYMENT_VERIFICATION_FAILED: 'USER_PAYMENT_VERIFICATION_FAILED',
            USER_STATUS_ABNORMAL: 'USER_STATUS_ABNORMAL',
            DO_NOT_HONOR: 'DO_NOT_HONOR',
            EXTERNAL_RESOURCE_LOAD_FAILED: 'EXTERNAL_RESOURCE_LOAD_FAILED',
            SUBMIT_PAYMENT_TIMEOUT: 'SUBMIT_PAYMENT_TIMEOUT',
            PAYMENT_RESULT_TIMEOUT: 'PAYMENT_RESULT_TIMEOUT',
            ERR_DATA_STRUCT_UNRECOGNIZED: 'ERR_DATA_STRUCT_UNRECOGNIZED',
            USER_CANCELED: 'USER_CANCELED',
            FORM_INVALID: 'FORM_INVALID'
        }

        const COMMON_ERROR_MESSAGE = {
            MOUNT_FAILED: $t('Failed to mount Antom Element, please refresh the page and try again'),
            REFRESH_PAGE: $t('Please refresh the page and try again'),
            SUMMIT_PAYMENT_FAILED: $t('Payment failed, please try again'),
            SUMMIT_PAYMENT_FAILED_AND_REFRESH: $t('Failed to submit payment, please refresh the page and try again'),
            PAYMENT_STATUS_UNKNOWN: $t('Payment status unknown, please try again')
        }

        // 错误码配置：包含错误提示信息和是否支持重试
        const ERROR_CONFIG = {
            [ERROR_CODES.UNKNOWN_EXCEPTION]: {
                message: 'Unknown exception. Please check your payment status and contact the merchant.',
                // 未知异常。请检查付款情况并联系商户
                supportRetry: true
            },
            [ERROR_CODES.USER_BALANCE_NOT_ENOUGH]: {
                message: 'Insufficient balance. Please top up or choose another payment method.',
                // 用户余额不足。请充值或选择其它支付方式。
                supportRetry: true
            },
            [ERROR_CODES.ORDER_NOT_EXIST]: {
                message: 'Order status is abnormal. Please check your payment status and contact the merchant.',
                // 订单状态异常。请检查付款情况并联系商户
                supportRetry: true
            },
            [ERROR_CODES.PROCESS_FAIL]: {
                message: 'Payment failed. Please check your payment status and contact the merchant.',
                // 支付失败。请检查付款情况并联系商户
                supportRetry: true
            },
            [ERROR_CODES.ORDER_IS_CANCELLED]: {
                message: 'Order has been cancelled. Please refresh the page and try again.',
                // 订单已撤销。如需再次支付，需要使用新的 paymentRequestId 重新发起支付。
                supportRetry: false
            },
            [ERROR_CODES.RISK_REJECT]: {
                message: 'Risk control rejected. Please try with a different card or contact your bank.',
                // 风控拒绝。建议换卡重试或联系发卡行。
                supportRetry: true
            },
            [ERROR_CODES.ORDER_IS_CLOSED]: {
                message: 'Order has been closed. Please refresh the page and try again.',
                // 订单已超时关单，使用新的 paymentRequestId 重新发起支付。
                supportRetry: false
            },
            [ERROR_CODES.INQUIRY_PAYMENT_SESSION_FAILED]: {
                message: 'Payment session expired. Please refresh the page and try again.',
                // 支付会话过期。订单已超时关单，使用新的 paymentRequestId 重新发起支付。
                supportRetry: false
            },
            [ERROR_CODES.ACCESS_DENIED]: {
                message: 'Payment failed. Please check your payment status and contact the merchant.',
                // 支付失败。请检查付款情况并联系商户
                supportRetry: true
            },
            [ERROR_CODES.CARD_EXPIRED]: {
                message: 'Card has expired. Please check the expiry date or use another card.',
                // 卡片已过期，请核对过期日期或使用其他卡片。
                supportRetry: true
            },
            [ERROR_CODES.INVALID_EXPIRY_DATE_FORMAT]: {
                message: 'Invalid expiry date format. Please check the expiry date or use another card.',
                // 卡片过期时间不正确，请核对过期日期或使用其他卡片。
                supportRetry: true
            },
            [ERROR_CODES.INVALID_EXPIRATION_DATE]: {
                message: 'Invalid expiration date. Please check the expiry date or use another card.',
                // 卡片过期时间不正确，请核对过期日期或使用其他卡片。
                supportRetry: true
            },
            [ERROR_CODES.INVALID_CVV]: {
                message: 'Invalid CVV. Please check the CVV or use another card.',
                // 卡片CVV不正确，请核对CVV或使用其他卡片。
                supportRetry: true
            },
            [ERROR_CODES.INVALID_CARD_NUMBER]: {
                message: 'Invalid card number. Please try with a different card or contact your bank.',
                // 卡号不正确。建议换卡重试或联系发卡行。
                supportRetry: true
            },
            [ERROR_CODES.SELECTED_CARD_BRAND_NOT_AVAILABLE]: {
                message: 'Card brand not supported. Please try with a different card or contact your bank.',
                // 卡品牌不支持。建议换卡重试或联系发卡行。
                supportRetry: true
            },
            [ERROR_CODES.CARD_NOT_SUPPORTED]: {
                message: 'Card not supported. Please try with a different card or contact your bank.',
                // 卡片不支持。建议换卡重试或联系发卡行。
                supportRetry: true
            },
            [ERROR_CODES.CARD_BIN_QUERY_ERROR]: {
                message: 'Invalid card number. Please try with a different card or contact your bank.',
                // 卡号不正确。建议换卡重试或联系发卡行。
                supportRetry: true
            },
            [ERROR_CODES.PAYMENT_IN_PROCESS]: {
                message: 'Payment is being processed. Please wait for completion.',
                // 支付正在处理中，请等待支付完成。
                supportRetry: true
            },
            [ERROR_CODES.CURRENCY_NOT_SUPPORT]: {
                message: 'Currency not supported by merchant. Transaction cannot be initiated.',
                // 商户不支持该币种，交易无法发起。
                supportRetry: true
            },
            [ERROR_CODES.INVALID_CARD]: {
                message: 'Invalid card. Please check card details or use another card.',
                // 卡号无效，请核对卡片详细信息或使用其他卡片。
                supportRetry: true
            },
            [ERROR_CODES.ISSUER_REJECTS_TRANSACTION]: {
                message: 'Transaction rejected by issuing bank. Please try with a different card or contact your bank.',
                // 发卡行拒绝交易，建议换卡重试或联系发卡行。
                supportRetry: true
            },
            [ERROR_CODES.INVALID_MERCHANT_STATUS]: {
                message: 'Merchant status is abnormal. Transaction cannot be initiated. Please refresh the page and try again.',
                // 商户状态异常，交易无法发起
                supportRetry: false
            },
            [ERROR_CODES.KEY_NOT_FOUND]: {
                message: 'Unknown exception. Please check your payment status and contact the merchant.',
                // 未知异常。请检查付款情况并联系商户
                supportRetry: false
            },
            [ERROR_CODES.MERCHANT_KYB_NOT_QUALIFIED]: {
                message: 'Merchant status is abnormal. Transaction cannot be initiated. Please refresh the page and try again.',
                // 商户状态异常，交易无法发起
                supportRetry: false
            },
            [ERROR_CODES.NO_PAY_OPTIONS]: {
                message: 'No payment options available. Please refresh the page and try again.',
                // 没有可用的支付选项。
                supportRetry: false
            },
            [ERROR_CODES.PARAM_ILLEGAL]: {
                message: 'Unknown exception. Please check your payment status and contact the merchant.',
                // 未知异常。请检查付款情况并联系商户
                supportRetry: false
            },
            [ERROR_CODES.PAYMENT_AMOUNT_EXCEED_LIMIT]: {
                message: 'Payment amount exceeds limit. Please refresh the page and try with a lower amount.',
                // 商户支付金额超过限额，交易无法发起。使用新的 paymentRequestId 更换金额后重新发起支付。
                supportRetry: false
            },
            [ERROR_CODES.PAYMENT_COUNT_EXCEED_LIMIT]: {
                message: 'Payment count exceeds limit. Please refresh the page and try again.',
                // 商户支付次数超过限制使用次数，交易无法发起。
                supportRetry: false
            },
            [ERROR_CODES.PAYMENT_NOT_QUALIFIED]: {
                message: 'Merchant status is abnormal. Transaction cannot be initiated. Please refresh the page and try again.',
                // 商户状态异常，交易无法发起
                supportRetry: false
            },
            [ERROR_CODES.SUSPECTED_CARD]: {
                message: 'Risk control rejected. Please try with a different card or contact your bank.',
                // 风控拒绝。建议换卡重试或联系发卡行。
                supportRetry: true
            },
            [ERROR_CODES.SYSTEM_ERROR]: {
                message: 'System error. Please check your payment status and contact the merchant.',
                // 未知异常。请检查付款情况并联系商户
                supportRetry: true
            },
            [ERROR_CODES.USER_AMOUNT_EXCEED_LIMIT]: {
                message: 'Amount exceeds limit. Please try with an amount less than or equal to your available balance.',
                // 金额超限。使用小于或等于账户可用余额的金额重新发起支付。
                supportRetry: true
            },
            [ERROR_CODES.USER_KYC_NOT_QUALIFIED]: {
                message: 'User status is abnormal. Please try with a different card or payment method.',
                // 用户状态异常。建议换卡重试或换支付方式重试。
                supportRetry: true
            },
            [ERROR_CODES.USER_PAYMENT_VERIFICATION_FAILED]: {
                message: 'User status is abnormal. Please try with a different card or contact your bank.',
                // 用户状态异常。建议换卡重试或联系发卡行。
                supportRetry: true
            },
            [ERROR_CODES.USER_STATUS_ABNORMAL]: {
                message: 'User status is abnormal. Please try with a different card or contact your bank.',
                // 用户状态异常。建议换卡重试或联系发卡行。
                supportRetry: true
            },
            [ERROR_CODES.DO_NOT_HONOR]: {
                message: 'Payment rejected by issuing bank. Please try with a different card or contact your bank.',
                // 支付被发卡行拒绝。建议换卡重试或联系发卡行。
                supportRetry: true
            },
            [ERROR_CODES.EXTERNAL_RESOURCE_LOAD_FAILED]: {
                message: 'Request failed. Please check your network connection or device status.',
                // 请求异常，请检查网络状况或者设备情况。
                supportRetry: true
            },
            [ERROR_CODES.SUBMIT_PAYMENT_TIMEOUT]: {
                message: 'Request timeout. Transaction cannot be initiated.',
                // 请求异常，交易无法发起。
                supportRetry: true
            },
            [ERROR_CODES.PAYMENT_RESULT_TIMEOUT]: {
                message: 'Request timeout. Transaction cannot be initiated.',
                // 请求异常，交易无法发起。
                supportRetry: true
            },
            [ERROR_CODES.ERR_DATA_STRUCT_UNRECOGNIZED]: {
                message: 'Request failed. Transaction cannot be initiated.',
                // 请求异常，交易无法发起。
                supportRetry: false
            },
            [ERROR_CODES.USER_CANCELED]: {
                message: 'Payment has been cancelled by user.',
                // 用户已取消支付
                supportRetry: true
            },
            [ERROR_CODES.FORM_INVALID]: {
                message: 'Payment information is invalid.',
                // 要素信息填写错误
                supportRetry: true
            }
        }

        return Component.extend({
            defaults: {
                template: 'Antom_Frontend/payment/card',
            },

            initialize: function () {
                this._super();
                this.elementPayment = null;
                this.isElementMounted = ko.observable(false);
                this.isLoading = ko.observable(false);
                const updateAllowedAction = function () {
                    this.isPlaceOrderActionAllowed(!this.isLoading() && this.isElementMounted());
                }.bind(this);

                this.isElementMounted.subscribe(updateAllowedAction);
                this.isLoading.subscribe(updateAllowedAction);
                this.isLoading.subscribe(function (newValue) {
                    if (newValue) {
                        fullScreenLoader.startLoader();
                    } else {
                        fullScreenLoader.stopLoader();
                    }
                }.bind(this));

                this.paymentRequestId = '';
                this.paymentSessionExpiryTime = '';
            },

            /**
             * Initialize Element after DOM is rendered
             */
            afterRender: function() {
                this.createAntomElement();
            },

            getCode: function () {
                return 'antom_card';
            },

            getEmail: function() {
                return customer.isLoggedIn() ? customer.customerData.email : quote.guestEmail;
            },

            /**
             * Create Element instance
             */
            createAntomElement: function() {
                this.isLoading(true);
                // Get session data from server
                this.getSessionData().done(function(responseStr) {
                    const response = JSON.parse(responseStr)
                    if (response.paymentSessionData && response.result && response.result.resultCode === RESULT_CODE.SUCCESS) {
                        this.paymentRequestId = response.paymentRequestId;

                        // 2025-12-10T22:01:09+08:00
                        this.paymentSessionExpiryTime = response.paymentSessionExpiryTime;
                        // let language = navigator.language || navigator.userLanguage;
                        // language = language.replace("-", "_");

                        const configData = customerData.get('antom-payment-request')();

                        // Initialize Element
                        this.elementPayment = new AMS.AMSElement({
                            environment: configData.environment === ENV.LIVE ? 'prod' : 'sandbox',
                            locale: 'en_US',
                            notRedirectAfterComplete: true,
                            sessionData: response.paymentSessionData
                        });

                        // Custom appearance
                        const appearance = {
                            theme: "default",
                            layout: { type: "Accordion" },
                            variables: {},
                        };

                        // Mount Element
                        this.elementPayment.mount(
                            {
                                type: 'payment',
                                appearance: appearance,
                                notRedirectAfterComplete: true,
                            },
                            '#antom-payment-element-container',
                        ).then(function(result) {
                            this.isLoading(false);
                            const error = result.error;
                            if (error && error.code) {
                                console.error('Antom Payment mount error:', error);
                                messageList.addErrorMessage({
                                    message: error.code + ': ' + COMMON_ERROR_MESSAGE.MOUNT_FAILED
                                });
                                this.isElementMounted(false);
                                return;
                            }

                            // Mount successful
                            this.isElementMounted(true);
                            console.log('Element mounted successfully');
                        }.bind(this)).catch(function (error) {
                            this.paymentRequestId = '';
                            this.paymentSessionExpiryTime = '';
                            this.isLoading(false);
                            this.isElementMounted(false);
                            messageList.addErrorMessage({
                                message: COMMON_ERROR_MESSAGE.MOUNT_FAILED + ': ' + error.message
                            });
                        }.bind(this));
                    } else {
                        this.isLoading(false);
                        this.isElementMounted(false);
                        this.paymentRequestId = '';
                        this.paymentSessionExpiryTime = '';
                        messageList.addErrorMessage({
                            message:  COMMON_ERROR_MESSAGE.MOUNT_FAILED + ': ' + responseStr
                        });
                    }
                }.bind(this)).fail(function(jqXHR, textStatus, errorThrown) {
                    this.isLoading(false);
                    this.isElementMounted(false);
                    this.paymentRequestId = '';
                    this.paymentSessionExpiryTime = '';
                    messageList.addErrorMessage({
                        message: COMMON_ERROR_MESSAGE.MOUNT_FAILED + ': ' + errorThrown
                    });
                }.bind(this));
            },

            /**
             * Destroy Element instance
             */
            destroyElement: function() {
                if (this.elementPayment) {
                    try {
                        this.elementPayment.destroy();
                        this.isElementMounted(false);
                        this.elementPayment = null;
                        console.log('Element destroyed successfully');
                    } catch (error) {
                        console.error('Error destroying Element:', error);
                    }
                }
            },

            gotoInquirePage: function(referenceOrderId) {
                window.location = '/antom/redirect?referenceOrderId=' + referenceOrderId;
            },

            resetPaymentStatus: function () {
                this.isLoading(false);
                this.refreshCart();
            },

            /**
             * Submit payment using Element
             */
            submitPayment: function(orderId, referenceOrderId) {
                if (!this.elementPayment || !this.isElementMounted()) {
                    this.restoreOrder(orderId).always(function () {
                        this.resetPaymentStatus();
                        messageList.addErrorMessage({
                            message: 'SubmitPayment: ' + COMMON_ERROR_MESSAGE.SUMMIT_PAYMENT_FAILED_AND_REFRESH
                        });
                    }.bind(this));
                    return;
                }

                // Submit payment via Element
                this.elementPayment.submitPayment().then(function(result) {
                    const error = result.error;
                    const status = result.status;
                    const userCanceled3D = result.userCanceled3D;

                    if (error) { // Handle error first
                        if (userCanceled3D || status === PAYMENT_STATUS.PROCESSING || status === PAYMENT_STATUS.PENDING) {
                            this.gotoInquirePage(referenceOrderId);
                            return;
                        }

                        this.restoreOrder(orderId).always(function () {
                            this.resetPaymentStatus();
                            this.handlePaymentError(result);
                        }.bind(this));

                        return;
                    }

                    // Handle success status
                    if (status === 'SUCCESS') {
                        redirectOnSuccessAction.execute();
                    } else {
                        this.restoreOrder(orderId).always(function () {
                            this.resetPaymentStatus();
                            messageList.addErrorMessage({
                                message: status + ': ' + COMMON_ERROR_MESSAGE.SUMMIT_PAYMENT_FAILED
                            });
                        }.bind(this));
                    }
                }.bind(this)).catch(function(error) {
                    this.restoreOrder(orderId).always(function () {
                        this.resetPaymentStatus();
                        messageList.addErrorMessage({
                            message: COMMON_ERROR_MESSAGE.SUMMIT_PAYMENT_FAILED + ': ' + error.message
                        });
                    }.bind(this));
                }.bind(this));
            },

            /**
             * Handle payment error based on error code
             */
            handlePaymentError: function(result) {
                const error = result.error;
                const errConfig = ERROR_CONFIG[error.code];
                messageList.addErrorMessage({
                    message: error.code + ': ' + COMMON_ERROR_MESSAGE.SUMMIT_PAYMENT_FAILED
                });

                if (errConfig && errConfig.supportRetry && this.isPaymentSessionValid() && (!result.needChangeSessionForRetry)) {
                    return;
                }

                this.reMountElement();
            },

            reMountElement: function () {
                this.destroyElement();
                setTimeout(function () {
                    this.createAntomElement();
                }.bind(this), 1000);
            },

            /**
             * Get session data from server
             */
            getSessionData: function() {
                let sessionUrl = '';
                let cartId = quote.getQuoteId();
                let postBody = {
                    cartId: cartId
                };
                if (customer.isLoggedIn()) {
                    sessionUrl = urlBuilder.createUrl('/antom/orders/carts/createPaymentSession', {});

                } else {
                    sessionUrl = urlBuilder.createUrl('/antom/orders/guest-carts/:cartId/createPaymentSession', {
                        cartId: cartId
                    });
                    postBody.email = this.getEmail();

                }
                return $.ajax({
                    url: '/' + sessionUrl,
                    type: 'POST',
                    dataType: 'json',
                    contentType: 'application/json',
                    data: JSON.stringify(postBody),
                });
            },

            /**
             * Restore the order to the shipping cart
             */
            restoreOrder: function(orderId) {
                let url = '';
                let cartId = quote.getQuoteId();
                if (customer.isLoggedIn()) {
                    url = urlBuilder.createUrl('/antom/quote/restore-by-order', {});
                } else {
                    url = urlBuilder.createUrl('/antom/quote/:cartId/restore-by-order', {
                        cartId: cartId
                    });
                }
                return $.ajax({
                    url: '/' + url,
                    type: 'POST',
                    dataType: 'json',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        orderId: orderId
                    }),
                });
            },

            /**
             * Check if payment session is still valid (not expired)
             */
            isPaymentSessionValid: function() {
                if (!this.paymentSessionExpiryTime) {
                    console.warn('Payment session expiry time is not set');
                    return false;
                }

                const now = new Date().getTime();
                const expiryTime = new Date(this.paymentSessionExpiryTime).getTime();

                // Check if current time is before expiry time
                return now < expiryTime;
            },

            getData: function() {
                return {
                    'method': this.getCode(),
                    'additional_data': {
                        paymentRequestId: this.paymentRequestId,
                    }
                };
            },

            refreshCart: function() {
                customerData.reload(['cart'], true);
                $(document).trigger('cart:update');
            },

            /**
             * Place order - this is called when user clicks "Place Order" button
             */
            placeOrder: function (data, event) {
                if (event) {
                    event.preventDefault();
                }

                if (this.validate() && additionalValidators.validate() && this.isPlaceOrderActionAllowed()) {
                    this.isPlaceOrderActionAllowed(false);
                    this.isLoading(true);

                    // this.elementPayment.validateFields().then(function(result) {
                    //     if (result.isValid) {
                            // First, place the order to get order ID
                            placeOrderAction(this.getData(), this.messageContainer)
                                .then(function (orderId) {
                                    let requestData = {
                                        "orderId": orderId
                                    };

                                    let paymentStatusUrl = '';
                                    if (customer.isLoggedIn()) {
                                        // Logged-in user: rest/default/V1/antom/orders/carts/mine/payment-status
                                        paymentStatusUrl = urlBuilder.createUrl('/antom/orders/carts/mine/payment-status', {});
                                    } else {
                                        // Guest user: rest/default/V1/antom/orders/guest-carts/{cartId}/payment-status
                                        const cartId = quote.getQuoteId();
                                        paymentStatusUrl = urlBuilder.createUrl('/antom/orders/guest-carts/:cartId/payment-status', {
                                            cartId: cartId
                                        });
                                    }

                                    $.ajax({
                                        url: '/' + paymentStatusUrl,
                                        type: 'POST',
                                        data: JSON.stringify(requestData),
                                        contentType: 'application/json'
                                    }).then(function (responseStr) {
                                        // TODO: Temporary solution, should directly return k-v JSON later
                                        const response = JSON.parse(responseStr);
                                        if (response && response.paymentStatus === RESULT_CODE.SUCCESS){
                                            this.submitPayment(orderId, response.referenceOrderId);
                                        } else {
                                            this.restoreOrder(orderId).always(function () {
                                                this.resetPaymentStatus();
                                                messageList.addErrorMessage({
                                                    message: COMMON_ERROR_MESSAGE.PAYMENT_STATUS_UNKNOWN + ': ' + responseStr
                                                });
                                                this.reMountElement();
                                            }.bind(this));
                                        }
                                    }.bind(this)).catch(function (jqXHR, textStatus, errorThrown) {
                                        this.restoreOrder(orderId).always(function () {
                                            this.resetPaymentStatus();
                                            messageList.addErrorMessage({
                                                message: COMMON_ERROR_MESSAGE.PAYMENT_STATUS_UNKNOWN + ': ' + textStatus + ' ' + errorThrown
                                            });
                                        }.bind(this));
                                    }.bind(this));
                                }.bind(this))
                                .catch(function (error) {
                                    this.resetPaymentStatus();
                                    errorProcessor.process(error, messageList);
                                }.bind(this));
                    //     } else {
                    //         this.isPlaceOrderActionAllowed(true);
                    //         this.isLoading(false);
                    //     }
                    // }.bind(this)).catch(function(error) {
                    //     this.isPlaceOrderActionAllowed(true);
                    //     this.isLoading(false);
                    // }.bind(this));
                }
            },

            /**
             * Pad orderId with leading zeros to ensure minimum 9 digits
             * @param {string|number} orderId - The order ID to pad
             * @returns {string} - Padded order ID with leading zeros
             */
            padOrderId: function(orderId) {
                // Convert to string for compatibility
                let strOrderId = String(orderId);

                // Pad with leading zeros to ensure 9 digits
                while (strOrderId.length < 9) {
                    strOrderId = '0' + strOrderId;
                }

                return strOrderId;
            },
        });
    }
);
