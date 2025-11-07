# Antom Frontend Module

Antom Payment Frontend Module for Magento 2. This module provides the frontend functionality for integrating Antom payment gateway with Magento 2, including payment UI components and user experience features.

## Features

- **Payment UI Components**: Complete payment interface and user experience
- **Multiple Payment Methods**: Support for Alipay, credit cards
- **Frontend Integration**: Seamless integration with Magento checkout process
- **Responsive Design**: Mobile-friendly payment interface

## Requirements

### Magento Version Support
- **Magento 2.4.x**: PHP 7.4+ recommended

### System Requirements
- **PHP**: ^7.4 || ^8.0
- **Composer**: 2.x

### Magento Dependencies
- Magento Framework 101.0+ (2.3.x+)
- Magento Sales Module 101.0+
- Magento Checkout Module 100.0+
- Magento Payment Module 100.0+
- Magento Quote Module 100.0+
- Magento Store Module 100.0+
- Magento Customer Module 101.0+
- Magento UI Module 100.0+

## Installation

### Via Composer (Recommended)
```bash
composer require ant-intl/plugin-magento2-frontend
```

### Manual Installation
1. Download the module
2. Extract to `app/code/Antom/Frontend`
3. Run:
   ```bash
   bin/magento module:enable Antom_Frontend
   bin/magento setup:upgrade
   bin/magento setup:di:compile
   bin/magento setup:static-content:deploy
   bin/magento cache:flush
   ```

## Configuration

Configure the module in Magento Admin:
1. Go to **Stores > Configuration > Antom > Payment Settings**
3. Configure frontend display settings

### Frontend Configuration

1. Log in to the Magento Admin Panel
2. Navigate to **Stores > Configuration > Sales > Payment Methods**
3. Find the **Antom Payment Methods** section
4. Configure the enabled status and parameters for each payment method

### Custom Styling

The module provides customizable CSS files located at:
```
view/frontend/web/css/payment.css
```

You can override the default styles by creating a custom theme.

## Supported Payment Methods(US region only)

- **Alipay (Alipay CN)**: Support for mainland China Alipay payments
- **Credit Card Payments**: Support for Visa, MasterCard, AMEX, JCB, Diners Club, Discover, UnionPay

## Compatibility Matrix

| Magento Version | PHP Version | Status |
|-----------------|-------------|--------|
| 2.3.0 - 2.3.4   | 7.4         | ✅ Supported |
| 2.3.5 - 2.3.7   | 7.4         | ✅ Supported |
| 2.4.0 - 2.4.3   | 8.0         | ✅ Supported |
| 2.4.4+          | 8.1+        | ✅ Supported |

## Development

### Project Structure
```
Antom/Frontend/
├── Block/              # Block classes for frontend logic
├── Model/              # Frontend models
├── view/               # View files
│   ├── frontend/       # Frontend views
│   │   ├── layout/     # Layout XML files
│   │   ├── templates/  # PHTML template files
│   │   └── web/        # Static resources
│   │       ├── css/    # Stylesheets
│   │       ├── images/ # Payment icons
│   │       └── js/     # JavaScript files
├── i18n/               # Internationalization files
├── etc/                # Configuration files
├── registration.php    # Module registration
├── composer.json       # Composer configuration
└── README.md          # This file
```

### CI/CD
This module includes:
- **Travis CI** configuration for automated testing
- **PHPUnit** for unit testing
- **Code coverage** reporting

## Troubleshooting

### Common Issues
1. **Static Content Deployment Error**: Run `bin/magento setup:static-content:deploy`
2. **CSS Not Loading**: Check file permissions and clear cache
3. **JavaScript Errors**: Check browser console for conflicts
4. **Payment Method Not Showing**: Verify module is enabled and configured (Note: Only available in US region)
5. **Layout Issues**: Check theme compatibility and custom CSS

### Support
For issues and questions, please refer to the official documentation or create an issue in the repository.

## License
This module is licensed under the MIT License.
