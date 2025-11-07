<?php
/**
 * Copyright © 2016 Magento. All rights reserved.
 * See COPYING.txt for license details.
 */
namespace Antom\Frontend\Block;

use Magento\Framework\Phrase;
use Magento\Payment\Block\ConfigurableInfo;

class CardInfo extends ConfigurableInfo
{
    /**
     * Returns label
     *
     * @param string $field
     * @return Phrase
     */
    protected function getLabel($field)
    {
        switch ($field) {
            case 'card_number':
                return __('Card Number');
            case 'card_holder':
                return __('Card Holder Name');
            case 'expire_date':
                return __('Expiration Date');
            case 'card_code':
                return __('Card Code (CVV)');
        }
        return __($field);
    }

    /**
     * Returns value view
     *
     * @param string $field
     * @param string $value
     * @return string | Phrase
     */
    protected function getValueView($field, $value)
    {
        switch ($field) {
            case 'card_number':
                // Mask card number for security (show only last 4 digits)
                return '**** **** **** ' . substr($value, -4);
            case 'card_code':
                // Don't show CVV for security
                return '***';
        }
        return parent::getValueView($field, $value);
    }
}
