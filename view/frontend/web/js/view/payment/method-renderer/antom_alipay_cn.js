/**
 * Copyright © 2016 Magento. All rights reserved.
 * See COPYING.txt for license details.
 */
/*browser:true*/
/*global define*/
define(
    [
        'Magento_Checkout/js/view/payment/default',
        'jquery',
        'Magento_Checkout/js/action/place-order',
        'Magento_Customer/js/model/customer',
        'mage/url',
        'Magento_Checkout/js/model/full-screen-loader',
        'Magento_Checkout/js/model/error-processor',
        'Magento_Ui/js/model/messageList',
        'Magento_Checkout/js/model/quote',
        'Magento_Checkout/js/model/url-builder',
        'mage/cookies'
    ],
    function (Component, $, placeOrderAction, customer, url, fullScreenLoader, errorProcessor, messageList, quote, urlBuilder) {
        'use strict';

        return Component.extend({
            defaults: {
                template: 'Antom_Frontend/payment/alipay_cn',
            },

            // Disable automatic redirect to payment success page
            redirectAfterPlaceOrder: false,

            getCode: function () {
                return 'antom_alipay_cn';
            },

            getData: function () {
                return {
                    'method': this.getCode(),
                    'additional_data': {}
                };
            },

            validate: function () {
                return true;
            },

            placeOrder: function (data, event) {
                if (event) {
                    event.preventDefault();
                }

                const self = this;

                if (this.validate() && this.isPlaceOrderActionAllowed()) {
                    this.isPlaceOrderActionAllowed(false);
                    fullScreenLoader.startLoader();
                    placeOrderAction(this.getData(), this.messageContainer)
                        .then(function (orderId) {
                            // Get order ID
                            if (!orderId) {
                                console.error('Order ID is missing');
                                throw new Error('Order ID is missing');
                            }

                            let requestData = {
                                "orderId": orderId
                            };

                            let paymentStatusUrl = '';
                            if (customer.isLoggedIn()) {
                                // Logged-in user, URL format: rest/default/V1/antom/orders/carts/mine/payment-status
                                paymentStatusUrl = urlBuilder.createUrl('/antom/orders/carts/mine/payment-status', {});
                            } else {
                                // Guest user, URL format: rest/default/V1/antom/orders/guest-carts/{cartId}/payment-status
                                const cartId = quote.getQuoteId();
                                paymentStatusUrl = urlBuilder.createUrl('/antom/orders/guest-carts/:cartId/payment-status', {
                                    cartId: cartId
                                });
                            }

                            // Call payment status API
                            return $.ajax({
                                url: '/' + paymentStatusUrl,
                                type: 'POST',
                                data: JSON.stringify(requestData),
                                contentType: 'application/json'
                            });
                        })
                        .then(function (responseStr) {
                            // TODO: Temporary solution, should return k-v JSON directly in the future
                            const response = JSON.parse(responseStr);
                            if (response && response.paymentAction && response.paymentAction.action === 'redirect' && response.paymentAction.normalUrl) {
                                window.location.href = response.paymentAction.normalUrl;
                            } else {
                                console.error('No redirect URL in response');
                                throw new Error('Unsupported payment action: ' + responseStr);
                            }
                        })
                        .catch(function (error) {
                            console.error('Payment process failed:', error);
                            self.isPlaceOrderActionAllowed(true);
                            fullScreenLoader.stopLoader();
                            errorProcessor.process(error, messageList);
                        });
                }
            }
        });
    }
);
