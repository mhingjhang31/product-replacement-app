import React from "react";
import {
  Box,
  Card,
  Layout,
  Link,
  Page,
  Text,
  DataTable,
  Button,
  Pagination,
  Frame
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server.js";

// Function to format date into "Tuesday, March 27, 2024" format
function formatDate(dateString) {
  const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
  const formattedDate = new Date(dateString).toLocaleDateString('en-US', options);
  return formattedDate;
}

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);

  const urlParams = new URLSearchParams(new URL(request.url).search);
  const page = parseInt(urlParams.get('page')) || 1;
  const pageSize = 10;
  const skip = (page - 1) * pageSize;

  const distinctOrderIDs = await prisma.orderReplacement.findMany({
    distinct: ['orderID'],
    select: { orderID: true },
  });

  const existingOrderIDs = distinctOrderIDs.map(order => order.orderID);

  // Function to fetch orders with cursor-based pagination
  async function fetchOrders(cursor = null, allOrders = []) {
    const query = `
      {
        orders(first: 250, query: "fulfillment_status:unfulfilled", sortKey: CREATED_AT, reverse: true, after: ${cursor ? `"${cursor}"` : null}) {
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
  const paginatedOrders = allOrders.slice(skip, skip + pageSize);

  return json({
    orders: paginatedOrders,
    page,
    totalOrders,
    pageSize,
  });
}

export default function AdditionalPage() {
  const { orders, page, totalOrders, pageSize } = useLoaderData();
  const navigate = useNavigate();

  const totalPages = Math.ceil(totalOrders / pageSize);

  const rows = orders.map((order) => ([
    order.id,
    order.name,
    formatDate(order.createdAt),
    `${order.customer.firstName} ${order.customer.lastName}`,
    `${order.totalPriceSet.shopMoney.currencyCode} ${order.totalPriceSet.shopMoney.amount}`,
    order.subtotalLineItemsQuantity,
    <Link url={`/app/order-detail?orderId=${order.id}`} external>
      <Button primary>Replace</Button>
    </Link>
  ]));

  const headings = [
    'Order ID',
    'Order Date',
    'Customer',
    'Total Price',
    'Items',
    'Actions',
  ];

  const handlePreviousPage = () => {
    if (page > 1) {
      navigate(`?page=${page - 1}`);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      navigate(`?page=${page + 1}`);
    }
  };

  return (
    <Frame>
      <TitleBar title="Unfulfilled Orders" />
      <Page fullWidth>
        <Layout>
          <Layout.Section>
            <Card sectioned>
              <DataTable
                columnContentTypes={['text', 'text', 'text', 'text', 'text', 'numeric', 'text']}
                headings={headings}
                rows={rows.map(row => row.slice(1))}
              />
            </Card>
          </Layout.Section>
        </Layout>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: '20px',
          }}
        >
          <Pagination
            onPrevious={handlePreviousPage}
            onNext={handleNextPage}
            hasPrevious={page > 1}
            hasNext={page < totalPages}
            label={`${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, totalOrders)} of ${totalOrders} orders`}
          />
        </div>
      </Page>
    </Frame>
  );
}
