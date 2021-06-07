`
mutation(
  $checkoutId: ID = "123",
  $lineItems: [CheckoutLineItemInput] = [{quantity: 1, variantId: "Z2lkOi8vc2hvcGlmeS9Qcm9kdWN0VmFyaWFudC80MDQxNDM2NjMzNTE2Mw=="}]) {
  checkoutLineItemsAdd(checkoutId: $checkoutId, lineItems: $lineItems) {
    checkoutUserErrors {
      field
      message
    }
    checkout {
      id
      webUrl
      subtotalPriceV2{
        amount
        currencyCode
      }
      totalTaxV2 {
        amount
        currencyCode
      }
      totalPriceV2 {
        amount
        currencyCode
      }
      completedAt
      createdAt
      taxesIncluded
      lineItems(first: 250) {
        pageInfo {
          hasNextPage
          hasPreviousPage
        }
        edges {
          node {
            id
            title
            variant {
              id
              sku
              title
              image {
                originalSrc
                altText
                width
                height
              }
              priceV2{
                amount
                currencyCode
              }
              compareAtPriceV2{
                amount
                currencyCode
              }
              product {
                handle
              }
            }
            quantity
          }
        }
      }
    }
  }
}
`
