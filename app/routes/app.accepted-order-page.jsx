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
  Frame,
  Pagination
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

  // Fetch distinct order names first
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

  // Fetch paginated data based on distinct order names
  const paginatedOrderNames = distinctOrderNames.slice(skip, skip + pageSize);

  const acceptedOrderReplacements = await prisma.orderReplacement.findMany({
    where: {
      orderStatus: 'Accepted',
      orderName: {
        in: paginatedOrderNames.map(order => order.orderName),
      },
    },
    select: {
      orderID: true,
      orderName: true,
      acceptedDate: true,
      customerName: true,
      orderStatus: true,
    },
    distinct: ['orderName'],
    orderBy: {
      sendDate: 'desc', // Order by sendDate in descending order
    },
  });

  return json({
    acceptedOrderReplacements,
    page,
    totalAcceptedOrders,
    pageSize,
  });
}

export default function AdditionalPage() {
  const { acceptedOrderReplacements, page, totalAcceptedOrders, pageSize } = useLoaderData();
  const navigate = useNavigate();

  const totalPages = Math.ceil(totalAcceptedOrders / pageSize);

  const acceptedReplacementRows = acceptedOrderReplacements.map((replacement) => ([
    replacement.orderName,
    formatDate(replacement.acceptedDate),
    replacement.customerName,
    replacement.orderStatus,
    <Link url={`/app/accepted-order-detail?orderId=${replacement.orderID}`} external>
      <Button primary>View</Button>
    </Link>
  ]));

  const acceptedReplacementHeadings = [
    'Order ID',
    'Accepted Date',
    'Customer',
    'Status',
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
      <TitleBar title="Accepted Orders" />
      <Page fullWidth>
        <Layout>
          <Layout.Section>
            <Card sectioned>
              <DataTable
                columnContentTypes={['text', 'text', 'text', 'text', 'text']}
                headings={acceptedReplacementHeadings}
                rows={acceptedReplacementRows}
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
            label={`${(page - 1) * pageSize + 1}-${page * pageSize} of ${totalAcceptedOrders} orders`}
          />
        </div>
      </Page>
    </Frame>
  );
}
