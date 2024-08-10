import React, { useState } from "react";
import {
  Card,
  Layout,
  Page,
  DataTable,
  Frame,
  Toast,
  Button
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useLoaderData, useSubmit } from "@remix-run/react";
import { json, redirect } from "@remix-run/node";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

export async function action({ request }) {
  const urlParams = new URLSearchParams(new URL(request.url).search);
  const orderId = urlParams.get('orderId');

  const orderReplacements = await prisma.orderReplacement.findMany({
    where: { orderID: orderId },
    select: {
      id: true,
      orderID: true,
      originalProductID: true,
      replacementProductID: true,
      replacementProduct: true,
      lineItemStatus: true
    },
  });

  const { admin } = await authenticate.admin(request);

  for (const replacement of orderReplacements) {
    if (replacement.lineItemStatus === 'Accepted') {
      if (replacement.replacementProductID.startsWith('custom_')) {
        // Custom item logic
        const beginEditResponse = await admin.graphql(`
          mutation beginEdit {
            orderEditBegin(id: "${replacement.orderID}") {
              calculatedOrder {
                id
              }
            }
          }
        `).then(res => res.json());

        if (!beginEditResponse.data || !beginEditResponse.data.orderEditBegin || !beginEditResponse.data.orderEditBegin.calculatedOrder) {
          console.error('Failed to begin order edit for order ID:', replacement.orderID);
          continue;
        }

        const calculatedOrderID = beginEditResponse.data.orderEditBegin.calculatedOrder.id;

        const addCustomItemResponse = await admin.graphql(`
          mutation addCustomItemToOrder {
            orderEditAddCustomItem(
              id: "${calculatedOrderID}", 
              title: "${replacement.replacementProduct}", 
              quantity: 1, 
              price: { amount: 40.00, currencyCode: PHP }
            ) {
              calculatedOrder {
                id
                addedLineItems(first: 5) {
                  edges {
                    node {
                      id
                    }
                  }
                }
              }
              userErrors {
                field
                message
              }
            }
          }
        `).then(res => res.json());

        if (addCustomItemResponse.data.userErrors && addCustomItemResponse.data.userErrors.length) {
          console.error('Failed to add custom item to order:', addCustomItemResponse.data.userErrors);
          continue;
        }

        const commitEditResponse = await admin.graphql(`
          mutation commitEdit {
            orderEditCommit(
              id: "${calculatedOrderID}", 
              notifyCustomer: false, 
              staffNote: "I edited the order! It was me!"
            ) {
              order {
                id
              }
              userErrors {
                field
                message
              }
            }
          }
        `).then(res => res.json());

        if (commitEditResponse.data.userErrors && commitEditResponse.data.userErrors.length) {
          console.error('Failed to commit order edit:', commitEditResponse.data.userErrors);
          continue;
        }

      } else {
        // Regular item logic
        const productId = replacement.replacementProductID.split('/').pop();

        const variantResponse = await admin.graphql(`
          query getVariant {
            productVariants(first: 10, query: "product_id:${productId}") {
              edges {
                node {
                  id
                }
              }
            }
          }
        `).then(res => res.json());

        if (!variantResponse.data || !variantResponse.data.productVariants || !variantResponse.data.productVariants.edges.length) {
          console.error('No product variants found for product ID:', productId);
          continue;
        }

        const variantId = variantResponse.data.productVariants.edges[0].node.id;

        const beginEditResponse = await admin.graphql(`
          mutation beginEdit {
            orderEditBegin(id: "${replacement.orderID}") {
              calculatedOrder {
                id
              }
            }
          }
        `).then(res => res.json());

        if (!beginEditResponse.data || !beginEditResponse.data.orderEditBegin || !beginEditResponse.data.orderEditBegin.calculatedOrder) {
          console.error('Failed to begin order edit for order ID:', replacement.orderID);
          continue;
        }

        const calculatedOrderID = beginEditResponse.data.orderEditBegin.calculatedOrder.id;

        const addVariantResponse = await admin.graphql(`
          mutation addVariantToOrder {
            orderEditAddVariant(id: "${calculatedOrderID}", variantId: "${variantId}", quantity: 1) {
              calculatedOrder {
                id
                addedLineItems(first: 5) {
                  edges {
                    node {
                      id
                      quantity
                    }
                  }
                }
              }
              userErrors {
                field
                message
              }
            }
          }
        `).then(res => res.json());

        if (addVariantResponse.data.userErrors && addVariantResponse.data.userErrors.length) {
          console.error('Failed to add variant to order:', addVariantResponse.data.userErrors);
          continue;
        }

        const commitEditResponse = await admin.graphql(`
          mutation commitEdit {
            orderEditCommit(
              id: "${calculatedOrderID}", 
              notifyCustomer: false, 
              staffNote: "I edited the order! It was me!"
            ) {
              order {
                id
              }
              userErrors {
                field
                message
              }
            }
          }
        `).then(res => res.json());

        if (commitEditResponse.data.userErrors && commitEditResponse.data.userErrors.length) {
          console.error('Failed to commit order edit:', commitEditResponse.data.userErrors);
          continue;
        }
      }

      // Remove original product logic
      const beginEditResponse2 = await admin.graphql(`
        mutation beginEdit {
          orderEditBegin(id: "${replacement.orderID}") {
            calculatedOrder {
              id
              lineItems(first: 250) {
                edges {
                  node {
                    id
                    variant {
                      id
                      product {
                        id
                      }
                    }
                  }
                }
              }
            }
          }
        }
        `
      ).then(res => res.json());
      
      if (!beginEditResponse2.data || !beginEditResponse2.data.orderEditBegin || !beginEditResponse2.data.orderEditBegin.calculatedOrder) {
        console.error('Failed to begin order edit for order ID:', replacement.orderID);
        continue;
      }

      const calculatedOrderID2 = beginEditResponse2.data.orderEditBegin.calculatedOrder.id;
      const lineItems = beginEditResponse2.data.orderEditBegin.calculatedOrder.lineItems.edges;

      
      const matchingLineItem = lineItems.find(item => item.node.id.split('/').pop() === replacement.originalProductID.split('/').pop());

      if (!matchingLineItem) {
        console.error('No matching line item found for product ID:', replacement.originalProductID.split('/').pop());
        continue;
      }

      const calculatedLineItemID = matchingLineItem.node.id;

      const setQuantityResponse = await admin.graphql(`
        mutation increaseLineItemQuantity {
          orderEditSetQuantity(id: "${calculatedOrderID2}", lineItemId: "${calculatedLineItemID}", quantity: 0) {
            calculatedOrder {
              id
              addedLineItems(first: 250) {
                edges {
                  node {
                    id
                    quantity
                  }
                }
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `).then(res => res.json());

      if (setQuantityResponse.data.userErrors && setQuantityResponse.data.userErrors.length) {
        console.error('Failed to set quantity for line item:', setQuantityResponse.data.userErrors);
        continue;
      }

      const commitEditResponse2 = await admin.graphql(`
        mutation commitEdit {
          orderEditCommit(
            id: "${calculatedOrderID2}", 
            notifyCustomer: false, 
            staffNote: "I edited the order! It was me!"
          ) {
            order {
              id
            }
            userErrors {
              field
              message
            }
          }
        }
      `).then(res => res.json());

      if (commitEditResponse2.data.userErrors && commitEditResponse2.data.userErrors.length) {
        console.error('Failed to commit order edit:', commitEditResponse2.data.userErrors);
        continue;
      }

      await prisma.orderReplacement.update({
        where: {
          id: replacement.id 
        },
        data: {
          confirmedDate: new Date(),
          orderStatus: "Confirmed"
        },
      }).then(result => {
        console.log('Updated record:', result);
      }).catch(error => {
        console.error('Error updating order replacement:', error);
      });

    } else if (replacement.lineItemStatus === 'Rejected') {
       // Remove original product logic
       const beginEditResponse2 = await admin.graphql(`
        mutation beginEdit {
          orderEditBegin(id: "${replacement.orderID}") {
            calculatedOrder {
              id
              lineItems(first: 250) {
                edges {
                  node {
                    id
                    variant {
                      id
                      product {
                        id
                      }
                    }
                  }
                }
              }
            }
          }
        }
        `
      ).then(res => res.json());
      
      if (!beginEditResponse2.data || !beginEditResponse2.data.orderEditBegin || !beginEditResponse2.data.orderEditBegin.calculatedOrder) {
        console.error('Failed to begin order edit for order ID:', replacement.orderID);
        continue;
      }

      const calculatedOrderID2 = beginEditResponse2.data.orderEditBegin.calculatedOrder.id;
      const lineItems = beginEditResponse2.data.orderEditBegin.calculatedOrder.lineItems.edges;

      
      const matchingLineItem = lineItems.find(item => item.node.id.split('/').pop() === replacement.originalProductID.split('/').pop());

      if (!matchingLineItem) {
        console.error('No matching line item found for product ID:', replacement.originalProductID.split('/').pop());
        continue;
      }

      const calculatedLineItemID = matchingLineItem.node.id;

      const setQuantityResponse = await admin.graphql(`
        mutation increaseLineItemQuantity {
          orderEditSetQuantity(id: "${calculatedOrderID2}", lineItemId: "${calculatedLineItemID}", quantity: 0) {
            calculatedOrder {
              id
              addedLineItems(first: 250) {
                edges {
                  node {
                    id
                    quantity
                  }
                }
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `).then(res => res.json());

      if (setQuantityResponse.data.userErrors && setQuantityResponse.data.userErrors.length) {
        console.error('Failed to set quantity for line item:', setQuantityResponse.data.userErrors);
        continue;
      }

      const commitEditResponse2 = await admin.graphql(`
        mutation commitEdit {
          orderEditCommit(
            id: "${calculatedOrderID2}", 
            notifyCustomer: false, 
            staffNote: "I edited the order! It was me!"
          ) {
            order {
              id
            }
            userErrors {
              field
              message
            }
          }
        }
      `).then(res => res.json());

      if (commitEditResponse2.data.userErrors && commitEditResponse2.data.userErrors.length) {
        console.error('Failed to commit order edit:', commitEditResponse2.data.userErrors);
        continue;
      }

      await prisma.orderReplacement.update({
        where: {
          id: replacement.id 
        },
        data: {
          confirmedDate: new Date(),
          orderStatus: "Confirmed"
        },
      }).then(result => {
        console.log('Updated record:', result);
      }).catch(error => {
        console.error('Error updating order replacement:', error);
      });


    }
    
  }

  return redirect(`/app/accepted-order-page`);
}

export async function loader({ request }) {
  const urlParams = new URLSearchParams(new URL(request.url).search);
  const orderId = urlParams.get('orderId');

  const orderReplacements = await prisma.orderReplacement.findMany({
    where: { orderID: orderId },
    select: {
      orderName: true,
      originalProduct: true,
      replacementProduct: true,
      lineItemStatus: true
    },
  });

  return json({ orderReplacements });
}

export default function AdditionalPage() {
  const { orderReplacements } = useLoaderData();
  const [toastActive, setToastActive] = useState(false);
  const submit = useSubmit();

  const rows = orderReplacements.map(replacement => [
    replacement.orderName,
    replacement.originalProduct,
    replacement.replacementProduct,
    replacement.lineItemStatus,
  ]);

  const headings = [
    'Order Name',
    'Original Product',
    'Replacement Product',
    'Status',
  ];

  const toggleToastActive = () => setToastActive(!toastActive);
  const toastMarkup = toastActive ? (
    <Toast content="Action completed" onDismiss={toggleToastActive} />
  ) : null;

  const handleConfirmClick = () => {
    submit(null, { method: 'post' });
  };

  return (
    <>
      <Frame>
        <TitleBar title="Order Replacement Details">
          <button primary onClick={handleConfirmClick}>Confirm</button>
        </TitleBar>
        <Page fullWidth>
          <Layout>
            <Layout.Section>
              <Card sectioned>
                <DataTable
                  columnContentTypes={['text', 'text', 'text', 'text']}
                  headings={headings}
                  rows={rows}
                />
              </Card>
            </Layout.Section>
          </Layout>
        </Page>
        {toastMarkup}
      </Frame>
    </>
  );
}


