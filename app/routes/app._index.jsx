import React, { useState, useEffect, useCallback  } from 'react';
import {
  Page,
  Card,
  Layout,
  Button,
  Collapsible,
  TextContainer,
  Link,
  CalloutCard,
  MediaCard,
  VideoThumbnail,
  FooterHelp
} from '@shopify/polaris';
import { useLoaderData, useNavigate } from "@remix-run/react";
import { json } from '@remix-run/node';
import { authenticate } from "../shopify.server";


async function getShopDetails(domainName) {
  const response = await fetch(`https://${domainName}/admin/api/2023-01/shop.json`, {
    headers: {
      'X-Shopify-Access-Token': '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',  // Replace with your actual access token
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch shop details');
  }

  const data = await response.json();
  return data.shop;
}


export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);
  const urlParams = new URL(request.url);
  const domainName = urlParams.searchParams.get('shop');

  let storeInformation;

  if (domainName) {
    const shopDetails = await getShopDetails(domainName);  // Get store details from Shopify API

    // Use upsert to either update or create the store information
    storeInformation = await prisma.storeInformation.upsert({
      where: { domainName },  // Use only the unique identifier in the where clause
      update: {
        companyName: shopDetails.name || '',
        contactNo: shopDetails.phone || '',
        whatsappNo: shopDetails.phone || '',
        senderName: shopDetails.name || '',
        email: shopDetails.email || '',
        companyAddress: (shopDetails.address1 + ", " + shopDetails.city + ", " + shopDetails.country_name + ", " + shopDetails.zip) || 'Default Company Address',
        durationOfEmailExpiration: 6, // Default duration
      },
      create: {
        domainName,
        companyName: shopDetails.name || '',
        emailContent: '',
        contactNo: shopDetails.phone || '',
        whatsappNo: shopDetails.phone || '',
        senderName: shopDetails.name || '',
        email: shopDetails.email || '',
        companyAddress: (shopDetails.address1 + ", " + shopDetails.city + ", " + shopDetails.country_name + ", " + shopDetails.zip) || 'Default Company Address',
        copyRightYear: '',
        emailColor: '#000000',
        durationOfEmailExpiration: 6, // Default duration
      },
    });
  }

  const distinctOrderNamesPending = await prisma.orderReplacement.findMany({
    where: {
      orderStatus: 'Pending',
    },
    distinct: ['orderName'],
    select: {
      orderName: true,
    },
  });

  const totalPendingOrders = distinctOrderNamesPending.length;

  const distinctOrderNamesConfirmed = await prisma.orderReplacement.findMany({
    where: {
      orderStatus: 'Confirmed',
    },
    distinct: ['orderName'],
    select: {
      orderName: true,
    },
  });

  const totalConfirmedOrders = distinctOrderNamesConfirmed.length;


  
  const distinctOrderNames = await prisma.orderReplacement.findMany({
    where: {
      orderStatus: 'Accepted',
    },
    distinct: ['orderName'],
    select: {
      orderName: true,
    },
  });

  const totalAcceptedOrders = distinctOrderNames.length;


  const distinctOrderIDs = await prisma.orderReplacement.findMany({
    distinct: ['orderID'],
    select: { orderID: true },
  });

  const existingOrderIDs = distinctOrderIDs.map(order => order.orderID);

  async function fetchOrders(cursor = null, allOrders = []) {
    const query = `
      {
        orders(first: 250, query: "fulfillment_status:unfulfilled", after: ${cursor ? `"${cursor}"` : null}) {
          edges {
            node {
              id
              name
              createdAt
              customer {
                firstName
                lastName
              }
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              displayFinancialStatus
              subtotalLineItemsQuantity
            }
            cursor
          }
          pageInfo {
            hasNextPage
          }
        }
      }
    `;

    const response = await admin.graphql(query);
    const parsedResponse = await response.json();
    const orders = parsedResponse.data.orders.edges.map((edge) => edge.node).filter(order => !existingOrderIDs.includes(order.id));
    const cursorData = parsedResponse.data.orders.edges;
    const allFetchedOrders = allOrders.concat(orders);

    if (parsedResponse.data.orders.pageInfo.hasNextPage) {
      const lastCursor = cursorData[cursorData.length - 1].cursor;
      return fetchOrders(lastCursor, allFetchedOrders);
    }

    return allFetchedOrders;
  }

    const allOrders = await fetchOrders();
    const totalOrders = allOrders.length;

  return json({
    storeInformation,
    totalAcceptedOrders,
    totalConfirmedOrders,
    totalPendingOrders,
    totalOrders
  });

}

function CollapsibleExample() {
  const { totalAcceptedOrders, totalConfirmedOrders, totalPendingOrders, totalOrders } = useLoaderData();
  const [openSection, setOpenSection] = useState(null);
  const [shopDomain, setShopDomain] = useState('');

  const handleToggle = useCallback((section) => {
    setOpenSection(openSection === section ? null : section);
  }, [openSection]);

  useEffect(() => {
    const shop = new URL(window.location).searchParams.get("shop");
    setShopDomain(shop);
  }, []);

  return (
    <Page>
      <Layout>
        <Layout.Section>
          <h2 style={{ fontSize: '2em', fontWeight: 800 }}>Welcome to Product Replacement App</h2>
          <br />
          <br />
          <CalloutCard
            title="How the Product Replacement App Can Help Your Store"
            illustration="https://cdn.shopify.com/s/assets/admin/checkout/settings-customizecart-705f57c725ac05be5a34ec20c05b94298cb8afd10aac7bd9c7ad02030f48cfa0.svg"
            primaryAction={{
              content: 'Learn more',
              url: '#',
            }}
            sectioned
            style={{ borderTop: 'none' }}
          >
            <p>Discover the benefits of the Product Replacement App for your store. This app simplifies the process of managing product replacements, ensuring customer satisfaction and streamlining your operations.</p>
          </CalloutCard>
        </Layout.Section>
        <Layout.Section>
          <MediaCard
            title="How to Set Up Your App in the Store"
            primaryAction={{
              content: 'Learn more',
              onAction: () => {},
            }}
            description={`In this tutorial, you'll learn step-by-step how to set up your app in the store. This video covers everything from installation to configuration, ensuring you can get your app up and running smoothly.`}
            popoverActions={[{ content: 'Dismiss', onAction: () => {} }]}
          >
            <VideoThumbnail
              videoLength={80}
              thumbnailUrl="https://burst.shopifycdn.com/photos/business-woman-smiling-in-office.jpg?width=1850"
              onClick={() => console.log('clicked')}
            />
          </MediaCard>
        </Layout.Section>
      </Layout>
      <br />
      <Layout>
        <Layout.Section variant="oneHalf">
          <Card title="Shipments / Lookups">
            <TextContainer>
              <h2 style={{ fontSize: '1em', fontWeight: 800 }}>No. of Unfulfilled Orders</h2>
              <h2 style={{ fontSize: '2em', fontWeight: 800 }}>{totalOrders}</h2>
              <p>These are the unfulfilled orders eligible for replacement due to unavailable line items in the warehouse.</p>
            </TextContainer>
          </Card>
        </Layout.Section>
        <Layout.Section variant="oneHalf">
          <Card title="Total retention revenue">
            <TextContainer>
              <h2 style={{ fontSize: '1em', fontWeight: 800 }}>No. of Pending Orders</h2>
              <h2 style={{ fontSize: '2em', fontWeight: 800 }}>{totalPendingOrders}</h2>
              <p>These orders have been replaced and are awaiting customer response.</p>
            </TextContainer>
          </Card>
        </Layout.Section>
      </Layout>
      <br />
      <Layout>
        <Layout.Section variant="oneHalf">
          <Card title="Shipments / Lookups">
            <TextContainer>
              <h2 style={{ fontSize: '1em', fontWeight: 800 }}>No. of Accepted Order</h2>
              <h2 style={{ fontSize: '2em', fontWeight: 800 }}>{totalAcceptedOrders}</h2>
              <p>These orders have been accepted by the customer but not yet confirmed by the admin.</p>
            </TextContainer>
          </Card>
        </Layout.Section>
        <Layout.Section variant="oneHalf">
          <Card title="Total retention revenue">
            <TextContainer>
              <h2 style={{ fontSize: '1em', fontWeight: 800 }}>No. of Confirmed Orders</h2>
              <h2 style={{ fontSize: '2em', fontWeight: 800 }}>{totalConfirmedOrders}</h2>
              <p>These are the orders that have been reviewed and confirmed by the admin</p>
            </TextContainer>
          </Card>
        </Layout.Section>
      </Layout>
      <br />
      <CalloutCard
        title="Do You Need Help?"
        illustration="https://cdn.shopify.com/s/assets/admin/checkout/settings-customizecart-705f57c725ac05be5a34ec20c05b94298cb8afd10aac7bd9c7ad02030f48cfa0.svg"
        primaryAction={{
          content: 'Contact Us',
          url: '#',
        }}
      >
        <p>Need assistance? Contact us for support with the Produce Replacement App.</p>
      </CalloutCard>
      <FooterHelp>
        Learn more about{' '}
        <Link url="https://help.shopify.com/manual/orders/fulfill-orders">
          Product Replacement App
        </Link>
      </FooterHelp>
    </Page>
  );
}

export default CollapsibleExample;
