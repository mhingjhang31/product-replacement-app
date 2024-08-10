import React, { useEffect, useState } from "react";
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

function formatDateTime(dateString) {
  const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };
  return new Date(dateString).toLocaleString('en-US', options);
}

function calculateRemainingTime(sendDate, timeExpiration) {
  const sendDateTime = new Date(sendDate);
  const now = new Date();
  const expirationTime = timeExpiration;
  const timeElapsed = now - sendDateTime;
  const sixHours = expirationTime * 60 * 60 * 1000;
  const timeRemaining = sixHours - timeElapsed;

  if (timeRemaining <= 0) {
    return "Time limit reached";
  }

  const hours = Math.floor(timeRemaining / (60 * 60 * 1000));
  const minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((timeRemaining % (60 * 1000)) / 1000);

  return `${hours}h ${minutes}m ${seconds}s`;
}

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);
  
  const firstStoreInformation = await prisma.storeInformation.findFirst();

  // Fetch the store information using the ID of the first record
  const storeInformation = await prisma.storeInformation.findUnique({
    where: { id: firstStoreInformation.id },
  });

  const urlParams = new URLSearchParams(new URL(request.url).search);
  const page = parseInt(urlParams.get('page')) || 1;
  const pageSize = 10;
  const skip = (page - 1) * pageSize;

  // Fetch distinct order names first
  const distinctOrderNames = await prisma.orderReplacement.findMany({
    where: {
      orderStatus: 'Pending',
    },
    distinct: ['orderName'],
    select: {
      orderName: true,
    },
  });

  const totalPendingOrders = distinctOrderNames.length;

  // Fetch paginated data based on distinct order names
  const paginatedOrderNames = distinctOrderNames.slice(skip, skip + pageSize);

  const pendingOrderReplacements = await prisma.orderReplacement.findMany({
    where: {
      orderStatus: 'Pending',
      orderName: {
        in: paginatedOrderNames.map(order => order.orderName),
      },
    },
    select: {
      orderID: true,
      orderName: true,
      sendDate: true,
      customerName: true,
      orderStatus: true,
    },
    distinct: ['orderName'],
    orderBy: {
      sendDate: 'desc', // Order by sendDate in descending order
    },
  });

  return json({
    pendingOrderReplacements,
    page,
    totalPendingOrders,
    pageSize,
    storeInformation,  // Include storeInformation in the response
  });
}

export default function AdditionalPage() {
  const { pendingOrderReplacements, page, totalPendingOrders, pageSize, storeInformation } = useLoaderData();
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState({});

  useEffect(() => {
    if (!storeInformation) return;

    const timer = setInterval(() => {
      const newTimeLeft = pendingOrderReplacements.reduce((acc, replacement) => {
        acc[replacement.orderID] = calculateRemainingTime(replacement.sendDate, storeInformation.durationOfEmailExpiration);
        return acc;
      }, {});
      setTimeLeft(newTimeLeft);
    }, 1000);

    return () => clearInterval(timer);
  }, [pendingOrderReplacements, storeInformation]);

  const totalPages = Math.ceil(totalPendingOrders / pageSize);

  const pendingReplacementRows = pendingOrderReplacements.map((replacement) => ([
    replacement.orderName,
    formatDateTime(replacement.sendDate),
    replacement.customerName,
    replacement.orderStatus,
    timeLeft[replacement.orderID] || "Loading...",
    <Link url={`/app/pending-order-detail?orderId=${replacement.orderID}`} external>
      <Button primary>View</Button>
    </Link>
  ]));

  const pendingReplacementHeadings = [
    'Order ID',
    'Send Date',
    'Customer',
    'Status',
    'Time Left',
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
      <TitleBar title="Pending Orders Page" />
      <Page fullWidth>
        <Layout>
          <Layout.Section>
            <Card sectioned>
              <DataTable
                columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
                headings={pendingReplacementHeadings}
                rows={pendingReplacementRows}
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
            label={`${(page - 1) * pageSize + 1}-${page * pageSize} of ${totalPendingOrders} orders`}
          />
        </div>
      </Page>
    </Frame>
  );
}
