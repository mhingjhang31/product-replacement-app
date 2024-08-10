import React, { useState, useEffect } from "react";
import {
  Card,
  Layout,
  Page,
  DataTable,
  Frame,
  Toast
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import prisma from "../db.server";

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

  const rows = orderReplacements.map(replacement => [
    replacement.orderName,
    replacement.originalProduct,
    replacement.replacementProduct,
    "None",
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

  return (
    <>
      <Frame>
        <TitleBar title="Order Replacement Details" />
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
