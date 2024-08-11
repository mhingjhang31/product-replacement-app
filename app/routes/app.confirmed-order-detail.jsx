import React, { useState, useCallback } from "react";
import emailjs from '@emailjs/browser';
import {
  Card,
  Layout,
  Page,
  DataTable,
  Button,
  Modal,
  TextContainer,
  Toast,
  Frame
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useLoaderData, useSubmit, redirect } from "@remix-run/react";
import { authenticate } from "../shopify.server";



// Loader function to fetch order and product data
export async function loader({ request }) {
  const urlParams = new URLSearchParams(request.url.split('?')[1]);
  const orderId = urlParams.get('orderId');

  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(`
    query {
      order: node(id: "${orderId}") {
        id
        ... on Order {
          name
          customer{
            email
            firstName
            lastName
          }
          lineItems(first: 10) {
            edges {
              node {
                id
                title
                currentQuantity
                originalUnitPriceSet {
                  presentmentMoney {
                    amount
                    currencyCode
                  }
                }
                originalTotalSet {
                  presentmentMoney {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }
      products(first: 10) {
        edges {
          node {
            id
            title
            totalInventory
            priceRangeV2 {
              minVariantPrice {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  `);

  const parsedResponse = await response.json();

  return {
    order: parsedResponse.data.order,
    products: parsedResponse.data.products.edges.map(edge => edge.node),
  };
}

export default function AdditionalPage() {
  const { order, products } = useLoaderData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLineItemId, setSelectedLineItemId] = useState(null);
  const [selectedProductDetailsByLineItem, setSelectedProductDetailsByLineItem] = useState({});
  const [toastActive, setToastActive] = useState(false);
  const [orderRows, setOrderRows] = useState(order.lineItems.edges);
  const submit = useSubmit();



  if (!order) {
    return <Page>Loading...</Page>;
  }

  
  const rows = orderRows.map((edge) => {
    const lineItem = edge.node;
    const selectedProductDetails = selectedProductDetailsByLineItem[lineItem.id];

    return [
      lineItem.title,
      lineItem.currentQuantity,
      `${lineItem.originalUnitPriceSet.presentmentMoney.currencyCode} ${parseFloat(lineItem.originalUnitPriceSet.presentmentMoney.amount).toFixed(2)}`,
      `${lineItem.originalTotalSet.presentmentMoney.currencyCode} ${parseFloat(lineItem.originalTotalSet.presentmentMoney.amount).toFixed(2)}`,
      

    ];
  });

  const orderHeadings = [
    'Original Product',
    'Quantity',
    'Unit Price',
    'Total Price',
  
  ];


  return (
    <>
      <Frame>
        <TitleBar title={`Confirmed Order Detail: ${order.name}`}>
        </TitleBar>
        <Page fullWidth>
        <Card sectioned>
              <DataTable
                columnContentTypes={['text', 'numeric', 'text', 'text']}
                headings={orderHeadings}
                rows={rows}
              />
            </Card>
        </Page>
        
      </Frame>
    </>
  );
}
