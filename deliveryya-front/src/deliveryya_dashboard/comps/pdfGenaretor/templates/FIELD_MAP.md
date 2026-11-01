# Order Slip Template Field Map

This document lists the HTML \id\ attributes used in \OrderSlipTemplate.html\ by the \PdfGenerator.tsx\ logic to inject dynamic content. By keeping the HTML externalized, UI redesigns or PDF tweaks are extremely fast—just ensure these exact IDs remain intact on the respective elements.

## Graphics & Branding
* \slip-logo-left\ (img): Company logo top-left
* \slip-logo-center\ (img): Company logo center
* \slip-barcode\ (img): Base64 1D barcode image
* \slip-whatsapp-qr\ (img): Base64 whatsapp QR code
* \slip-location-qr\ (img): Base64 Google Maps QR code

## Header Info
* \slip-generated-date\: Top-right timestamp
* \slip-order-code-text\: String representation under the barcode
* \slip-barcode-wrap\: Wrapper div to hide if there's no barcode

## Order Summary
* \slip-order-price\: Order price formatted amount
* \slip-delivery-fee\: Delivery fee formatted amount
* \slip-quantity\: Number of items
* \slip-weight\: Weight in kg
* \slip-collective-amount\: Total collective amount

## Receiver Details
* \slip-receiver-name\: Name of receiver
* \slip-receiver-address\: Full address line
* \slip-receiver-city\: City name
* \slip-receiver-mobile1\: Primary phone number
* \slip-receiver-mobile2\: Secondary phone number
* \slip-receiver-mobile2-row\: Row wrapper to hide if no mobile2

## Sender / Market Details
* \slip-sender-type\: 'MARKET' or 'USER'
* \slip-sender-name\: Sender or market name
* \slip-sender-email\: Sender email
* \slip-sender-address\: Sender physical address
* \slip-sender-phone\: Sender contact number
* \slip-sender-phone-row\: Wrapper to hide if no phone
* \slip-sender-note\: Custom sender notes
* \slip-sender-note-row\: Wrapper to hide if no note

## Additional Notes & Cards
* \slip-description\: HTML rich-text description for the order
* \slip-note-card\: Wrapper card to hide if no description
* \slip-whatsapp-link\: Raw whatsapp URL text
* \slip-whatsapp-card\: Wrapper card to hide if no whatsapp
* \slip-location-link\: Raw maps URL text
* \slip-location-card\: Wrapper card to hide if no location
