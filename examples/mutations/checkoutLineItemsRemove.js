`
mutation(
	$checkoutId: ID = "123",
	$lineItemIds: [ID] = ["Z2lkOi8vc2hvcGlmeS9Qcm9kdWN0VmFyaWFudC80MDQxNDM2NjMzNTE2Mw==__LI"]) {
    checkoutLineItemsRemove(checkoutId: $checkoutId, lineItemIds: $lineItemIds) {
      checkoutUserErrors {
      field
      message
    }
    checkout {
      id
      webUrl
      subtotalPriceV2 {
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
