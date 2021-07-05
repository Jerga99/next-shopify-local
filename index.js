const express = require('express')
const { ApolloServer, gql } = require('apollo-server-express')
const { DEF_CHECKOUT } = require("./default-data")

const fs = require('fs'),
    path = require('path'),
    filePath = path.join(__dirname, "data", 'index.json');

const convertNodeToCursor = (node, field = "id") => {
  return Buffer.from(node[field], 'binary').toString('base64')
}

const convertCursorToNodeId = (cursor, field = "id") => {
  return Buffer.from(cursor[field], 'base64').toString('binary')
}

// Get Custom Data From JSON -> getData("products")
const getData = (type) => {
  return new Promise((res, rej) => {
    fs.readFile(filePath, {encoding: 'utf-8'}, function(err, sData){
      if (err) {
        return rej("Cannot read the file!")
      }

      const data = JSON.parse(sData)
      return res(data)
    })
  })
}

const saveData = (data) => {
  const stringifiedData = JSON.stringify(data, null, 2)
  return new Promise((res, rej) => {
    fs.writeFile(filePath, stringifiedData, function(err){
      if (err) {
        return rej("Cannot read the file!")
      }

      return res("Data Saved!")
    })
  })
}

const getTotalPrice = (lineItems) => {
  return lineItems.reduce((acc, li) => {
    return acc + Number(li.variant.priceV2.amount) * li.quantity
  }, 0)
}

const getAllProducts = (args) => {
  let { first = 30, afterCursor } = args
  let afterIndex = 0
  return new Promise((res, rej) => {
    fs.readFile(filePath, {encoding: 'utf-8'}, function(err, sData){
      if (!err) {
        const data = JSON.parse(sData)["products"]

        if (typeof afterCursor === 'string') {
          /* Extracting nodeId from afterCursor */
          let nodeId = convertCursorToNodeId(afterCursor)
          /* Finding the index of nodeId */
          let nodeIndex = data.findIndex(d => d.id === nodeId)
          if (nodeIndex >= 0) {
              afterIndex = nodeIndex + 1 // 1 is added to exclude the afterIndex node and include items after it
          }
        }

        const slicedData = data.slice(afterIndex, afterIndex + first)
        const edges = slicedData.map (node => {
          return {
            node,
            cursor: convertNodeToCursor(node)
          }
        })

        let startCursor, endCursor = null
        if (edges.length > 0) {
            startCursor = convertNodeToCursor(edges[0].node)
            endCursor = convertNodeToCursor(edges[edges.length - 1].node)
        }
        let hasNextPage = data.length > afterIndex + first
        let hasPreviousPage = afterIndex > 0

      res({
        totalCount: data.length,
        edges,
        pageInfo: {
          startCursor,
          endCursor,
          hasNextPage,
          hasPreviousPage
        }
    })
    } else {
      rej("File Error!")
    }
    });
  })
}

const typeDefs = gql`
  type PageInfo {
    startCursor: String
    endCursor: String
    hasNextPage: Boolean
    hasPreviousPage: Boolean
  }

  type MoneyV2 {
    amount: Int
    currencyCode: String
  }

  type PriceRange {
    value: Int
    minVariantPrice: MoneyV2
    maxVariantPrice: MoneyV2
  }

  type ImageEdge {
    cursor: String!
    node: Image
  }

  type ImageConnection {
    pageInfo: PageInfo!
    edges: [ImageEdge]
  }

  type Image {
    pageInfo: PageInfo!
    originalSrc: String
    altText: String
    height: Int
    width: Int
  }

  type Option {
    id: ID
    name: String
    values: [String]
  }

  type SelectedOption {
    name: String
    value: String
  }

  type Variant {
    id: ID
    title: String
    sku: String
    selectedOptions: [SelectedOption]
    priceV2: MoneyV2
    compareAtPriceV2: MoneyV2
    image: Image
    product: Product
  }

  type VariantEdge {
    cursor: String!
    node: Variant
  }

  type VariantConnection {
    pageInfo: PageInfo!
    edges: [VariantEdge]
  }

  type Value {
    label: String
    isDefaul: Boolean
    hexColors: [String]
  }

  type ProductOption {
    entityId: Int
    displayName: String
    values: [Value]
  }

  interface Node {
    id: ID!
  }

  type ProductConnection {
    pageInfo: PageInfo!
    edges: [ProductEdge]
  }

  type ProductEdge {
    cursor: String!
    node: Product
  }

  type Product implements Node {
    id: ID!
    title: String
    handle: String
    description: String
    descriptionHtml: String
    vendor: String
    priceRange: PriceRange
    options: [Option]
    images(first: Int): ImageConnection
    variants(first: Int): VariantConnection
  }

  type CheckoutUserError {
    field: String
    message: String
  }

  type LineItem implements Node {
    id: ID!
    quantity: Int
    title: String
    unityPrice: MoneyV2
    variant: Variant
    product: Product
  }

  type LineItemEdge {
    cursor: String!
    node: LineItem
  }

  type LineItemConnection {
    pageInfo: PageInfo!
    edges: [LineItemEdge]
  }

  type Checkout implements Node {
    id: ID!
    webUrl: String
    subtotalPriceV2: MoneyV2
    totalTaxV2: MoneyV2
    totalPriceV2: MoneyV2
    completedAt: String
    createdAt: String
    taxesIncluded: Boolean
    lineItems(first: Int): LineItemConnection
  }

  type CheckoutResponse {
    checkoutUserErrors: [CheckoutUserError]
    checkout: Checkout
  }

  type Query {
    products(first: Int): ProductConnection
    productByHandle(handle: String): Product
    hello: String
    node(id: ID!): Node
  }

  input CheckoutLineItemInput {
    variantId: ID
    quantity: Int
  }

  input CheckoutLineItemUpdateInput {
    id: ID
    variantId: ID
    quantity: Int
  }

  input CheckoutCreateInput {
    id: ID
  }

  type Mutation {
    checkoutCreate(input: CheckoutCreateInput): CheckoutResponse
    checkoutLineItemsAdd(checkoutId: ID, lineItems: [CheckoutLineItemInput]): CheckoutResponse
    checkoutLineItemsUpdate(checkoutId: ID, lineItems: [CheckoutLineItemUpdateInput]): CheckoutResponse
    checkoutLineItemsRemove(checkoutId: ID, lineItemIds: [ID]): CheckoutResponse
  }
`;

const resolvers = {
  Node: {
    __resolveType (obj, ctx, info) {
      return obj.__typename; // GraphQLError is thrown
    }
  },
  Checkout: {
    lineItems: (parent, args, context, info) => {
      const edges = parent.lineItems.map (node => ({
        node,
        cursor: convertNodeToCursor(node, "id")
      }))

      return {
        edges,
        pageInfo: {
          startCursor: null,
          endCursor: null,
          hasNextPage: false,
          hasPreviousPage: false
        }
      }
    }
  },
  Product: {
    images: (parent, args, context, info) => {
      const edges = parent.images.map (node => ({
        node,
        cursor: convertNodeToCursor(node, "originalSrc")
      }))

      return {
        edges,
        pageInfo: {
          startCursor: null,
          endCursor: null,
          hasNextPage: false,
          hasPreviousPage: false
        }
      }
    },
    variants: (parent, args, context, info) => {
      const edges = parent.variants.map (node => {

        node.product = {}
        node.product.handle = parent.handle
        node.image = parent.images[0]

        return {
          node,
          cursor: convertNodeToCursor(node, "id")
        }
      })

      return {
        edges,
        pageInfo: {
          startCursor: null,
          endCursor: null,
          hasNextPage: false,
          hasPreviousPage: false
        }
      }
    }
  },
  Mutation: {
    checkoutLineItemsRemove: async (_, { checkoutId, lineItemIds }) => {
      const data = await getData()
      const { checkout } = data

      lineItemIds.forEach(liId => {
        const liIndex = checkout.lineItems.findIndex(sli => {
          return sli.id === liId
        })
        checkout.lineItems.splice(liIndex, 1)
      })

      checkout.totalPriceV2.amount = getTotalPrice(checkout.lineItems) || 0;
      checkout.subtotalPriceV2.amount = getTotalPrice(checkout.lineItems) || 0;

      await saveData({...data, checkout})

      return {
        checkout,
        checkoutUserErrors: []
      }
    },
    checkoutLineItemsUpdate: async (_, { checkoutId, lineItems }) => {
      const data = await getData()
      const { checkout } = data
      const storedLineItems = checkout.lineItems

      lineItems.forEach(li => {
        const liIndex = checkout.lineItems.findIndex(sli => {
          return sli.id === li.id
        })
        storedLineItems[liIndex].quantity = li.quantity
        if (storedLineItems[liIndex].quantity === 0) {
          checkout.lineItems.splice(liIndex, 1)
        }
      })

      checkout.totalPriceV2.amount = getTotalPrice(checkout.lineItems) || 0;;
      checkout.subtotalPriceV2.amount = getTotalPrice(checkout.lineItems) || 0;

      await saveData({...data, checkout})

      return {
        checkout,
        checkoutUserErrors: []
      }
    },
    checkoutLineItemsAdd: async (_, { checkoutId, lineItems }) => {
      const data = await getData()
      const { checkout } = data

      if (!checkout) {
        throw new Error("Checkout is not created!")
      }

      function findVariantsProduct(products, variantId) {
        const product = products.filter(p => {
          return p.variants.find(v => v.id === variantId)
        })[0] || null

        return product
      }

      if (checkout.lineItems && checkout.lineItems.length > 0) {
        checkout.lineItems.forEach((chLi, index) => {
          const existingLiIndex = lineItems.findIndex(li => li.variantId === chLi.variantId)

          if (existingLiIndex >= 0) {
            checkout.lineItems[index].quantity++
            lineItems.splice(existingLiIndex, 1)
          }
        })
      }

        lineItems.forEach(li => {
        const product = findVariantsProduct(data["products"], li.variantId)
        li.id = li.variantId + "__LI"
        li.title = product.title
        li.variant = product.variants.find(v => {
          return v.id === li.variantId
        })
        li.variant.image = product.images[0]
        li.product = product
      })

      checkout.lineItems = [...checkout.lineItems, ...lineItems]
      checkout.totalPriceV2.amount =getTotalPrice(checkout.lineItems) || 0;
      checkout.subtotalPriceV2.amount = getTotalPrice(checkout.lineItems) || 0;
      await saveData({
        ...data,
        checkout
      })

      return {
        checkout,
        checkoutUserErrors: []
      }
    },
    checkoutCreate: async () => {
      const data = await getData()
      const { checkout } = data

      if (!checkout.id) {
        await saveData({
          ...data,
          checkout: DEF_CHECKOUT
        })
      }
      return {
        checkout: !checkout.id ? DEF_CHECKOUT : checkout,
        checkoutUserErrors: []
      }
    }
  },
  Query: {
    node: async (_, { id }) => {
      const data = await getData()
      let foundNode = null;

      Object.keys(data).forEach(dataType => {
        const entity = data[dataType]
        if (foundNode) { return; }
        if (Array.isArray(entity)) {
          foundNode = entity.find(e => e.id === id)
        } else if (entity.id === id) {
          foundNode = entity
        }
      })

      return foundNode
    },
    hello: () => {
      return 'Hello world!';
    },
    productByHandle: async (parent, args, ...rest) => {
      let { handle } = args
      const products = await getAllProducts(args)

      const product = products.edges.find(e => e.node.handle === handle)?.node
      return product || null
    },
    products: (parent, args, context, info) => {
      return getAllProducts(args)
    }
  },
};

const server = new ApolloServer({ typeDefs, resolvers })
server.start()

const app = express();
server.applyMiddleware({ app });


app.listen(4000, () => {
  console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`)
})
