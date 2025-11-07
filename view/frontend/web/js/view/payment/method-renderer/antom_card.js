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
        'Magento_Customer/js/customer-data',
        'Antom_Frontend/js/lib/crypto-js.min',
        'Antom_Frontend/js/lib/jsencrypt.min',
        'Magento_Checkout/js/model/payment/additional-validators',
        'Magento_Payment/js/model/credit-card-validation/credit-card-number-validator',
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
        customerData,
        CryptoJS,
        JSEncrypt,
        additionalValidators,
        cardNumberValidator,
    ) {
        'use strict';

        // Define card type constants
        const CARD_TYPE_VISA = 'antom_card_visa';
        const CARD_TYPE_MASTERCARD = 'antom_card_mastercard';
        const CARD_TYPE_AMEX = 'antom_card_amex';
        const CARD_TYPE_JCB = 'antom_card_jcb';
        const CARD_TYPE_DISCOVER = 'antom_card_discover';
        const CARD_TYPE_UNIONPAY = 'antom_card_unionpay';
        const CARD_TYPE_DINERS = 'antom_card_dinser';

        const JSEncryptConstructor = JSEncrypt.JSEncrypt;
        const CARD_INFO = [
            {logo: 'Antom_Frontend/images/VISA.svg', value: CARD_TYPE_VISA, validatorType: 'VI', name: 'Visa'},
            {logo: 'Antom_Frontend/images/MasterCard.svg', value: CARD_TYPE_MASTERCARD, validatorType: 'MC', name: 'MasterCard'},
            {logo: 'Antom_Frontend/images/AMEX.svg', value: CARD_TYPE_AMEX, validatorType: 'AE', name: 'American Express'},
            {logo: 'Antom_Frontend/images/JCB.svg', value: CARD_TYPE_JCB, validatorType: 'JCB', name: 'JCB'},
            {logo: 'Antom_Frontend/images/Discover.svg', value: CARD_TYPE_DISCOVER, validatorType: 'DI', name: 'Discover'},
            {logo: 'Antom_Frontend/images/unionpay-international.svg', value: CARD_TYPE_UNIONPAY, validatorType: 'UP', name: 'UnionPay'},
            {logo: 'Antom_Frontend/images/DinersClub.svg', value: CARD_TYPE_DINERS, validatorType: 'DN', name: 'Diners Club'}
        ]

        return Component.extend({
            defaults: {
                template: 'Antom_Frontend/payment/card',
            },

            initialize: function () {
                this._super();
                this.creditCardHolderName = ko.observable('');
                this.creditCardType = ko.observable(null);

                // Add custom validation methods
                this.addCustomValidators();

                // Listen for credit card number changes to automatically detect card type
                this.creditCardNumber.subscribe(function (value) {
                    if (value) {
                        /* {
                            isValid: boolean,
                            isPotentiallyValid: boolean,
                            card: {
                                type: 'VI',  // Card brand type
                                niceType: 'Visa',
                                gaps: [4, 8, 12],
                                lengths: [16],
                                code: { name: 'CVV', size: 3 }
                            }
                        } */
                        const result = cardNumberValidator(value);
                        if (result.isPotentiallyValid && result.card) {
                            const availableCardInfo = this.getAvailableCards().find(card => card.validatorType === result.card.type);
                            this.creditCardType(availableCardInfo.value);
                        } else {
                            this.creditCardType(null);
                        }
                    } else {
                        this.creditCardType(null);
                    }
                }, this);
            },

            getCode: function () {
                return 'antom_card';
            },

            /**
             * Validate payment method
             * @returns {Boolean}
             */
            validate: function () {
                var $form = $('#' + this.getCode() + '-form');

                // Initialize validation if not already done
                if (!$form.data('validator')) {
                    $form.validation();
                }

                return $form.validation('isValid');
            },

            /**
             * Validate individual field on blur
             * @param {String} fieldName - The name of the field to validate
             */
            validateField: function (fieldName) {
                var $form = $('#' + this.getCode() + '-form');

                // Initialize validation if not already done
                if (!$form.data('validator')) {
                    $form.validation();
                }

                // Get the specific field element
                var fieldId = this.getCode() + '_' + fieldName;
                var $field = $('#' + fieldId);

                if ($field.length) {
                    // Trigger validation for this specific field
                    $field.valid();
                }
            },

            /**
             * Get available credit card
             * @returns {Array}
             */
            getAvailableCards: function () {
                const configData = customerData.get('antom-payment-request')();
                const enabledCards = configData.enabledCards;
                return enabledCards.map(function (cardValue) {
                    const _cardInfo = CARD_INFO.find(function (card) {
                        return card.value === cardValue;
                    });
                    return Object.assign(_cardInfo, {
                        logo: require.toUrl(_cardInfo.logo)
                    });
                }.bind(this));
            },

            /**
             * Get available credit card type
             * @returns {Array}
             */
            getCcAvailableTypesValues: function() {
                return this.getAvailableCards().map(function (card) {
                    return card.validatorType;
                });
            },


            /**
             * Add custom validators for jQuery validation
             */
            addCustomValidators: function() {
                var self = this;

                // Add credit card type validation
                $.validator.addMethod('antom-validate-card-type', function(value, element, params) {
                    if (!value) {
                        return true; // Empty value handled by required validation
                    }

                    try {
                        const result = cardNumberValidator(value);
                        if (!result.isPotentiallyValid || !result.card) {
                            return false;
                        }

                        // Check if card type is in enabled list
                        if (params && params.length > 0) {
                            return params.indexOf(result.card.type) > -1;
                        }

                        return true;
                    } catch (e) {
                        console.error('Card type validation error:', e);
                        return false;
                    }
                }, $.mage.__('This card type is not supported.'));

                // Add expiration date validation in MM/YY format
                $.validator.addMethod('validate-cc-exp-mm-yy', function(value, element) {
                    if (!value) {
                        return true; // Empty value handled by required validation
                    }

                    // Match MM/YY format (01/23, 12/25, etc.)
                    var expPattern = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
                    if (!expPattern.test(value)) {
                        return false;
                    }

                    try {
                        var parts = value.split('/');
                        var month = parseInt(parts[0], 10);
                        var year = parseInt('20' + parts[1], 10); // Convert to 4-digit year (20XX)

                        var currentDate = new Date();
                        var currentYear = currentDate.getFullYear();
                        var currentMonth = currentDate.getMonth() + 1;

                        // Validate month range (1-12)
                        if (month < 1 || month > 12) {
                            return false;
                        }

                        // Validate year is not in the past
                        if (year < currentYear) {
                            return false;
                        }

                        // If current year, validate month is not in the past
                        if (year === currentYear && month < currentMonth) {
                            return false;
                        }

                        // Validate reasonable year range (within 20 years from current year)
                        if (year > currentYear + 20) {
                            return false;
                        }

                        return true;
                    } catch (e) {
                        console.error('Expiration date validation error:', e);
                        return false;
                    }
                }, $.mage.__('Please enter a valid expiration date in MM/YY format (e.g., 12/25).'));

                // Add CVV validation (supports 3-4 digits based on card type)
                $.validator.addMethod('antom-validate-cc-cvn', function(value, element, params) {
                    if (!value) {
                        return true; // Empty value handled by required validation
                    }

                    try {
                        // Remove all non-digit characters
                        const cvv = value.replace(/\D/g, '');

                        // Determine CVV length based on card type
                        let expectedLength = 3; // Default 3 digits

                        const cardNumber = $(params).val();
                        const result = cardNumberValidator(cardNumber);
                        if (result.isPotentiallyValid && result.card) {
                            if (result.card.type === 'AE') {
                                expectedLength = 4; // American Express requires 4-digit CVV
                            }

                        }


                        // Validate CVV length
                        if (cvv.length !== expectedLength) {
                            return false;
                        }

                        // Validate contains only digits
                        if (!/^\d+$/.test(cvv)) {
                            return false;
                        }

                        return true;
                    } catch (e) {
                        console.error('CVV validation error:', e);
                        return false;
                    }
                }, function(params, element) {
                    let expectedLength = 3; // Default 3 digits

                    const cardNumber = $(params).val();
                    const result = cardNumberValidator(cardNumber);
                    if (result.isPotentiallyValid && result.card) {
                        if (result.card.type === 'AE') {
                            expectedLength = 4; // American Express requires 4-digit CVV
                        }

                    }
                    return $.mage.__('Please enter a valid ' + expectedLength + '-digit credit card verification number.');
                });
            },

            getCipherText: function(key, content) {
                let cipher = CryptoJS.AES.encrypt(content, CryptoJS.enc.Utf8.parse(key), {
                    mode: CryptoJS.mode.ECB,
                    padding: CryptoJS.pad.Pkcs7
                });
                let ciphertext = cipher.toString();
                return ciphertext
            },

            formatPublicKey: function(publicKey) {
                const cleanKey = publicKey.trim();
                const formattedKey =
                    "-----BEGIN PUBLIC KEY-----\n    " + cleanKey + "    -----END PUBLIC KEY-----";
                return formattedKey;
            },

            generateAESKey: function() {
                const keyLength = 16; // 16*2 character length
                const array = new Uint8Array(keyLength);
                window.crypto.getRandomValues(array);
                // Convert to hexadecimal string
                return Array.from(array, byte => {
                    const hex = byte.toString(16);
                    return hex.length === 1 ? '0' + hex : hex;
                }).join('');
            },

            // Get current time yyyy-MM-dd HH:mm:ss
            getDateTime: function() {
                let now = new Date();
                let year = now.getFullYear();
                let month = now.getMonth() + 1;
                let day = now.getDate();
                let hour = now.getHours();
                let minute = now.getMinutes();
                let second = now.getSeconds();

                // Simplify zero-padding logic
                month = month < 10 ? '0' + month : month;
                day = day < 10 ? '0' + day : day;
                hour = hour < 10 ? '0' + hour : hour;
                minute = minute < 10 ? '0' + minute : minute;
                second = second < 10 ? '0' + second : second;

                return year + '-' + month + '-' + day + ' ' + hour + ':' + minute + ':' + second;
            },

            requestCardToken: function () {
                const configData = customerData.get('antom-payment-request')();
                let gatewayUrl = configData.gatewayUrl;
                // Remove trailing "/" if present in gatewayUrl
                if (gatewayUrl && gatewayUrl.endsWith('/')) {
                    gatewayUrl = gatewayUrl.slice(0, -1);
                }
                const publicKey = configData.antomPublicKey;
                const clientId = configData.clientId;
                if (!publicKey) {
                    throw new Error('Public key is missing');
                }
                if (!clientId) {
                    throw new Error('Client ID is missing');
                }

                const billingAddress = quote.billingAddress();
                // Parse expiration date (MM/YY format)
                let expiryMonth = '';
                let expiryYear = '';
                const expDate = this.creditCardExpMonth(); // Now contains full MM/YY
                if (expDate && expDate.indexOf('/') !== -1) {
                    const parts = expDate.split('/');
                    expiryMonth = parts[0];
                    expiryYear = parts[1];
                    // If year is 2 digits, convert to 4 digits
                    if (expiryYear.length === 2) {
                        const currentYear = new Date().getFullYear();
                        const currentCentury = Math.floor(currentYear / 100) * 100;
                        const fullYear = currentCentury + parseInt(expiryYear);
                        // If parsed year is less than current year, assume next century
                        expiryYear = fullYear < currentYear ? (fullYear + 100).toString() : fullYear.toString();
                    }
                }

                const cardData = {
                    "paymentMethodDetail": {
                        "paymentMethodDetailType": "card",
                        "card": {
                            "cardNo": this.creditCardNumber(),
                            "expiryMonth": expiryMonth,
                            "expiryYear": expiryYear,
                        },
                    },
                    customerId: '' // Will be filled if customer is logged in
                }


                if (billingAddress) {
                    cardData.paymentMethodDetail.card.billingAddress = {
                        address1: billingAddress.street ? billingAddress.street[0] : '',
                        city: billingAddress.city || '',
                        region: billingAddress.countryId || '',
                        state: billingAddress.region || ''
                    };

                    cardData.paymentMethodDetail.card.instUserName = {
                        firstName: billingAddress.firstname || '',
                        fullName: this.creditCardHolderName(),
                        lastName: billingAddress.lastname || '',
                        middleName: ''
                    };
                }

                if (customer.isLoggedIn()) {
                    cardData.customerId = customer.customerData.id;
                }

                const aesKey = this.generateAESKey();
                let ciphertext = this.getCipherText(aesKey, JSON.stringify(cardData));

                const encrypt = new JSEncryptConstructor();
                const formattedPublicKey = this.formatPublicKey(publicKey)
                encrypt.setPublicKey(formattedPublicKey);
                let encryptedAESKey = encrypt.encrypt(aesKey);

                const headers = {
                    'client-id': clientId,
                    'request-time': this.getDateTime(),
                    'signature': 'algorithm=RSA256, keyVersion=2, signature=testing_signature',
                    'encrypt': 'algorithm=AES256, keyVersion=0, symmetricKey=' + encodeURIComponent(encryptedAESKey)
                }

                return $.ajax({
                    type: 'POST',
                    url: gatewayUrl + '/amsin/api/v1/paymentMethods/cacheCard.htm',
                    data: ciphertext,
                    contentType: 'text/plain',
                    headers: headers,
                    dataType: 'json'
                })
            },


            // This payment method will be automatically triggered when selected
            getData: function () {
                return {
                    method: this.getCode()
                }
            },

            getPaymentInfoRequestBody: function () {
                const self = this;
                return this.requestCardToken().then(function (response) {
                    console.log('Cache card response:', response);
                    if (response && response.paymentMethodDetail && response.paymentMethodDetail.card && response.paymentMethodDetail.card.cardToken) {
                        return {
                            method: self.getCode(),
                            additional_data: {
                                card_token: response.paymentMethodDetail.card.cardToken,
                            }
                        };
                    } else {
                        throw new Error('Card token not found in response')
                    }
                });
            },

            placeOrder: function (data, event) {
                if (event) {
                    event.preventDefault();
                }
                const self = this;
                if (this.validate() && additionalValidators.validate() && this.isPlaceOrderActionAllowed()) {
                    this.isPlaceOrderActionAllowed(false);
                    fullScreenLoader.startLoader();

                    this.getPaymentInfoRequestBody().then(function (requestData) {
                        return placeOrderAction(requestData, self.messageContainer);
                    })
                    .then(function (orderId) {
                        if (!orderId) {
                            console.error('Order ID is missing');
                            throw new Error('Order ID is missing');
                        }

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

                        return $.ajax({
                            url: '/' + paymentStatusUrl,
                            type: 'POST',
                            data: JSON.stringify(requestData),
                            contentType: 'application/json'
                        });
                    })
                    .then(function (responseStr) {
                        // TODO: Temporary solution, should directly return k-v JSON later
                        const response = JSON.parse(responseStr);
                        if (response && response.paymentAction && response.paymentAction.action === 'redirect' && response.paymentAction.normalUrl && response.is3ds) {
                            fullScreenLoader.stopLoader();
                            self.start3dsChallenge(response.paymentAction.normalUrl, response.referenceOrderId);
                        } else if (response && response.paymentAction && response.paymentAction.action === 'redirect' && response.paymentAction.normalUrl) {
                            window.location.href = response.paymentAction.normalUrl;
                        } else {
                            console.error('No redirect URL in response');
                            throw new Error('Unsupported payment action: ' + JSON.stringify(response));
                        }
                    })
                    .catch(function (error) {
                        console.error('Payment process failed:', error);
                        self.isPlaceOrderActionAllowed(true);
                        fullScreenLoader.stopLoader();
                        errorProcessor.process(error, messageList);
                    });
                }
            },

            start3dsChallenge: function (challengeUrl, referenceOrderId) {
                const inquireUrl = '/antom/redirect?referenceOrderId=' + referenceOrderId;
                const modalHtml = '<iframe id="3ds-iframe"' +
                                ' src="' + challengeUrl + '"' +
                                ' width="550px"' +
                                ' height="800px"' +
                                ' frameborder="0">' +
                                '</iframe>';
                const modal = $('<div/>').html(modalHtml).modal({
                    title: '',
                    type: 'popup',
                    responsive: false,
                    innerScroll: true,
                    modalClass: 'antom-three-ds-modal',
                    buttons: [],
                    clickableOverlay: false,
                    closed: function() {
                        window.removeEventListener('message', listener);
                        window.location.href = inquireUrl;
                    }
                });

                modal.modal('openModal');

                const listener = function (event) {
                    if (event.origin !== 'https://checkout.antom.com') return;
                    const eventData = JSON.parse(event.data);
                    if (eventData.eventType === 'antom-close-event') {
                        modal.modal('closeModal');
                        // Redirect logic has been moved to modalClosed event handler
                    }
                }.bind(this);

                window.addEventListener('message', listener);
            }
        });
    }

);
