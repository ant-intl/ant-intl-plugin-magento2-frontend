<?php
/**
 * Copyright © 2016 Magento. All rights reserved.
 * See COPYING.txt for license details.
 */
namespace Antom\Frontend\Model\Ui;

use Magento\Checkout\Model\ConfigProviderInterface;

/**
 * Class ConfigProvider
 */
class ConfigProvider implements ConfigProviderInterface
{
    const ALIPAY_CODE = 'antom_alipay_cn';
    const CARD_CODE = 'antom_card';

    /**
     * Retrieve assoc array of checkout configuration
     *
     * @return array
     */
    public function getConfig()
    {
        return [
            'payment' => [
                self::ALIPAY_CODE => [
                    'transactionResults' => [
                        'success' => __('Success'),
                        'failure' => __('Failure')
                    ]
                ],
                self::CARD_CODE => [
                    'paymentAcceptanceMarkHref' => '#',
                    'paymentAcceptanceMarkSrc' => ''
                ]
            ]
        ];
    }
}
