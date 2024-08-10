import React, { useState, useEffect, useCallback } from "react";
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
  Frame,
  Text,
  TextField
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useLoaderData, useSubmit, redirect } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// Action function to handle form submission
export async function action({ request }) {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const selectedProductDetailsByLineItem = JSON.parse(formData.get('selectedProductDetailsByLineItem'));
  const order = JSON.parse(formData.get('order'));

  const orderId = order.id.split('/').pop();

  await admin.graphql(
    `#graphql
    mutation {
      flowTriggerReceive(
        handle: "replaced-order",
        payload: {
          order_id: ${orderId}
        }
      ) {
        userErrors {
          field
          message
        }
      }
    }`,
  );

  for (const edge of order.lineItems.edges) {
    const lineItem = edge.node;

    // Skip if lineItem.id is empty or undefined
    if (!lineItem.id || lineItem.id.trim() === "") continue;

    const selectedProductDetails = selectedProductDetailsByLineItem[lineItem.id];

    // Skip if selectedProductDetails is undefined
    if (!selectedProductDetails) continue;

    const totalReplacementAmount = selectedProductDetails ? selectedProductDetails.priceRangeV2.minVariantPrice.amount * lineItem.currentQuantity : 0;
    const balance = lineItem.originalTotalSet.presentmentMoney.amount - totalReplacementAmount;

    let order_name = order.name.replace('#', '');

    await prisma.orderReplacement.create({
      data: {
        orderID: order.id,
        orderName: order_name,
        originalHandle: lineItem.product.handle,
        originalProductID: lineItem.id,
        originalProduct: lineItem.title,
        quantity: lineItem.currentQuantity,
        unitPrice: parseFloat(lineItem.originalUnitPriceSet.presentmentMoney.amount),
        totalPrice: parseFloat(lineItem.originalTotalSet.presentmentMoney.amount),
        replacementHandle: selectedProductDetails.handle,
        replacementProductID: selectedProductDetails.id,
        replacementProduct: selectedProductDetails.title,
        replacementQuantity: lineItem.currentQuantity,
        replacementPrice: parseFloat(selectedProductDetails.priceRangeV2.minVariantPrice.amount),
        totalReplacementAmount: totalReplacementAmount,
        balance: balance,
        sendDate: new Date(),
        customerName: order.customer.firstName + " " + order.customer.lastName,
        orderStatus: 'Pending'
      },
    });
}


  return redirect(`/app/edit-order-page`);
}

// Loader function to fetch order and product data
export async function loader({ request }) {
  const urlParams = new URLSearchParams(request.url.split('?')[1]);
  const orderId = urlParams.get('orderId');

  const { admin } = await authenticate.admin(request);

  const firstStoreInformation = await prisma.storeInformation.findFirst();

  // Fetch the store information using the ID of the first record
  const storeInformation = await prisma.storeInformation.findUnique({
    where: { id: firstStoreInformation.id },
  });



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
          lineItems(first: 250) {
            edges {
              node {
                id
                title
                product{
                  handle
                }
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
      products(first: 250) {
        edges {
          node {
            id
            title
            handle
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
    storeInformation
  };
}

export default function AdditionalPage() {
  const { order, products, storeInformation } = useLoaderData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState(false);
  const [selectedLineItemId, setSelectedLineItemId] = useState(null);
  const [selectedProductDetailsByLineItem, setSelectedProductDetailsByLineItem] = useState({});
  const [toastActive, setToastActive] = useState(false);
  const [orderRows, setOrderRows] = useState(order.lineItems.edges);
  const [shopDomain, setShopDomain] = useState('');
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItemQuantity, setCustomItemQuantity] = useState('');
  const submit = useSubmit();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (value) => {
    setSearchQuery(value);
  };

  useEffect(() => {
    const shop = new URL(window.location).searchParams.get("shop");
    setShopDomain(shop);
  }, []);

  const handleAddReplacement = (lineItemId) => {
    setIsModalOpen(true);
    setSelectedLineItemId(lineItemId);
  };

  const handleAddCustomItem = (lineItemId) => {
    setIsCustomItemModalOpen(true);
    setSelectedLineItemId(lineItemId);
  };

  const handleRemoveLineItem = (lineItemId) => {
    setOrderRows(prevRows => prevRows.filter(edge => edge.node.id !== lineItemId));
    setToastActive(true);
  };

  const handleSelectProduct = (selectedProductId) => {
    const selected = products.find(product => product.id === selectedProductId);
    setSelectedProductDetailsByLineItem(prev => ({
      ...prev,
      [selectedLineItemId]: selected,
    }));
    setIsModalOpen(false);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedLineItemId(null);
  };

  const closeCustomItemModal = () => {
    setIsCustomItemModalOpen(false);
    setSelectedLineItemId(null);
    setCustomItemName('');
    setCustomItemPrice('');
    setCustomItemQuantity('');
  };

  const handleSaveCustomItem = () => {
    const customItem = {
      id: `custom_${Date.now()}`,
      title: customItemName,
      handle: `custom_${customItemName.toLowerCase().replace(/ /g, '_')}`,
      priceRangeV2: {
        minVariantPrice: {
          amount: customItemPrice,
          currencyCode: order.lineItems.edges[0].node.originalUnitPriceSet.presentmentMoney.currencyCode,
        },
      },
    };

    setSelectedProductDetailsByLineItem(prev => ({
      ...prev,
      [selectedLineItemId]: customItem,
    }));
    closeCustomItemModal();
  };

  const toggleToastActive = useCallback(() => setToastActive((active) => !active), []);

  const sendEmail = async (e) => {
    e.preventDefault();

    const service_id = storeInformation.service_id;
    const template_id = storeInformation.template_id;
    const publicKey = storeInformation.publicKey;

    const updatedOrder = {
        ...order,
        lineItems: {
            edges: orderRows
        }
    };

    const formData = new FormData();
    formData.append('selectedProductDetailsByLineItem', JSON.stringify(selectedProductDetailsByLineItem));
    formData.append('order', JSON.stringify(updatedOrder));
    submit(formData, { method: "post" });

    const rows = orderRows
    .filter((edge) => {
        const lineItem = edge.node;
        return lineItem && lineItem.id && lineItem.id.trim() !== "" && selectedProductDetailsByLineItem[lineItem.id];
    })
    .map((edge) => {
        const lineItem = edge.node;
        const selectedProductDetails = selectedProductDetailsByLineItem[lineItem.id];
        const totalReplacementAmount = selectedProductDetails ? selectedProductDetails.priceRangeV2.minVariantPrice.amount * lineItem.currentQuantity : 0;
        const balance = lineItem.originalTotalSet.presentmentMoney.amount - totalReplacementAmount;
        const options = { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-PH', options);
        const parts = formatter.formatToParts(now);

        let formattedDateTime = `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}-${parts.find(p => p.type === 'day').value} ${parts.find(p => p.type === 'hour').value}:${parts.find(p => p.type === 'minute').value}:${parts.find(p => p.type === 'second').value}`;

        const cleanedOrderName = order.name.replace('#', '');

        return `
            <tr>
                <td>${order.name}</td>
                <td>${lineItem.title}</td>
                <td>${lineItem.originalTotalSet.presentmentMoney.currencyCode} ${parseFloat(lineItem.originalTotalSet.presentmentMoney.amount).toLocaleString()}</td>
                <td>${selectedProductDetails ? selectedProductDetails.title : ""}</td>
                <td>${selectedProductDetails ? `${lineItem.originalTotalSet.presentmentMoney.currencyCode} ${totalReplacementAmount.toLocaleString()}` : ""}</td>
                <td>${selectedProductDetails ? `${lineItem.originalTotalSet.presentmentMoney.currencyCode} ${balance.toLocaleString()}` : ""}</td>
            </tr>
        `;
    }).join('');


    let order_name = order.name.replace('#', '');

    const tableHTML = `
        
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr>
                    <th style="border: 1px solid #ddd; padding: 8px; vertical-align: middle;">Order ID</th>
                    <th style="border: 1px solid #ddd; padding: 8px; vertical-align: middle;">Original Product</th>
                    <th style="border: 1px solid #ddd; padding: 8px; vertical-align: middle;">Original Amount</th>
                    <th style="border: 1px solid #ddd; padding: 8px; vertical-align: middle;">Replacement Product</th>
                    <th style="border: 1px solid #ddd; padding: 8px; vertical-align: middle;">Total Replacement Amount</th>
                    <th style="border: 1px solid #ddd; padding: 8px; vertical-align: middle;">Balance</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
        
        <a href="https://order-item-replacement-app.myshopify.com/?OrderID=${order_name}" style="background-color: 	#1DB954; text-align: center; color: white; padding: 5px 15px; text-decoration: none; border-radius: 3px; font-size: 12px; display: block; margin-bottom: 5px;">Confirm Order</a>
        `;

    const template_params = {
        emailMessageTitle: storeInformation.emailMessageTitle,
        from_name: storeInformation.companyName,
        from_email: storeInformation.email,
        color: storeInformation.emailColor,
        order_id: order_name,
        companyAddress: storeInformation.companyAddress,
        copyrightYear: storeInformation.copyRightYear,
        whatsappNo: storeInformation.whatsappNo,
        email_content: storeInformation.emailContent,
        to_email: order.customer.email,
        to_name: order.customer.firstName + " " + order.customer.lastName,
        message: tableHTML,
    };

    emailjs.send(service_id, template_id, template_params, publicKey).then((response) => {
        console.log("Email Sent");
    });
};


  if (!order) {
    return <Page>Loading...</Page>;
  }

  const filteredProducts = products.filter(product =>
    product.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const productRows = filteredProducts.map(product => [
    product.title,
    product.totalInventory,
    `${product.priceRangeV2.minVariantPrice.amount} ${product.priceRangeV2.minVariantPrice.currencyCode}`,
    <Button onClick={() => handleSelectProduct(product.id)}>Select</Button>,
  ]);

  const productHeadings = [
    'Product Name',
    'Quantity',
    'Price',
    'Actions',
  ];
  const rows = orderRows
  .filter((edge) => edge.node.currentQuantity > 0)  // Filter out items with currentQuantity of 0
  .map((edge) => {
    const lineItem = edge.node;
    const selectedProductDetails = selectedProductDetailsByLineItem[lineItem.id];
    const totalReplacementAmount = selectedProductDetails ? (selectedProductDetails.priceRangeV2.minVariantPrice.amount * lineItem.currentQuantity).toFixed(2) : "0.00";
    const balance = (lineItem.originalTotalSet.presentmentMoney.amount - totalReplacementAmount).toFixed(2);
    return [
      lineItem.title,
      lineItem.currentQuantity,
      `${lineItem.originalUnitPriceSet.presentmentMoney.currencyCode} ${parseFloat(lineItem.originalUnitPriceSet.presentmentMoney.amount).toFixed(2)}`,
      `${lineItem.originalTotalSet.presentmentMoney.currencyCode} ${parseFloat(lineItem.originalTotalSet.presentmentMoney.amount).toFixed(2)}`,
      selectedProductDetails ? selectedProductDetails.title : "", // Replacement Product
      selectedProductDetails ? lineItem.currentQuantity : "", // Quantity
      selectedProductDetails ? `${selectedProductDetails.priceRangeV2.minVariantPrice.currencyCode} ${parseFloat(selectedProductDetails.priceRangeV2.minVariantPrice.amount).toFixed(2)}` : "",
      selectedProductDetails ? `${lineItem.originalTotalSet.presentmentMoney.currencyCode} ${totalReplacementAmount}` : "", // Total Replacement Amount
      selectedProductDetails ? `${lineItem.originalTotalSet.presentmentMoney.currencyCode} ${balance}` : "", // Balance
      (
        <div>
          <Button onClick={() => handleAddReplacement(lineItem.id)}>Add</Button>
          <Button onClick={() => handleAddCustomItem(lineItem.id)}>Add Custom Item</Button>
        </div>
      ),
    ];
  });


  const orderHeadings = [
    'Original Product',
    'Quantity',
    'Unit Price',
    'Total Price',
    'Replacement Product',
    'Quantity',
    'Price',
    'Total Replacement',
    'Balance',
    'Actions',
  ];

  const toastMarkup = toastActive ? (
    <Toast content="Item Removed" onDismiss={toggleToastActive} />
  ) : null;

  return (
    <>
      <Frame>
        <TitleBar title={`Order Detail: ${order.name}`}>
       
          <button variant="primary" onClick={sendEmail}>
            Send Email
          </button>
        </TitleBar>
        
        <Page fullWidth>
        <DataTable
                columnContentTypes={['text', 'numeric', 'text', 'text', 'text', 'numeric', 'text', 'text', 'text', 'text']}
                headings={orderHeadings}
                rows={rows}
              />
        </Page>
        {isModalOpen && (
          <Modal
            open={isModalOpen}
            onClose={closeModal}
            title="Add Replacement"
            primaryAction={{
              content: 'Close',
              onAction: closeModal,
            }}
          >
            <Modal.Section>
              <TextContainer>
              <TextField
                  label="Search Products"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search by product name"
                />
                <DataTable
                  columnContentTypes={['text', 'numeric', 'text', 'text']}
                  headings={productHeadings}
                  rows={productRows}
                />
              </TextContainer>
            </Modal.Section>
          </Modal>
        )}
        {isCustomItemModalOpen && (
          <Modal
            open={isCustomItemModalOpen}
            onClose={closeCustomItemModal}
            title="Add Custom Item"
            primaryAction={{
              content: 'Save',
              onAction: handleSaveCustomItem,
            }}
            secondaryActions={[
              {
                content: 'Cancel',
                onAction: closeCustomItemModal,
              },
            ]}
          >
            <Modal.Section>
              <TextContainer>
                <TextField
                  label="Name"
                  value={customItemName}
                  onChange={(value) => setCustomItemName(value)}
                  placeholder="Enter item name"
                />
                <TextField
                  label="Price"
                  value={customItemPrice}
                  onChange={(value) => setCustomItemPrice(value)}
                  type="number"
                  placeholder="Enter item price"
                />
                <TextField
                  label="Quantity"
                  value={customItemQuantity}
                  onChange={(value) => setCustomItemQuantity(value)}
                  type="number"
                  placeholder="Enter item quantity"
                />
              </TextContainer>
            </Modal.Section>
          </Modal>
        )}
        {toastMarkup}
      </Frame>
    </>
  );
}
