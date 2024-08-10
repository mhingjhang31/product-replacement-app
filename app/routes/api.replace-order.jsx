import { json } from "@remix-run/node";
import prisma from "../db.server.js"; 

export async function action({ request }) {




  if (request.method !== 'POST') {
    return json({ message: "Method Not Allowed" }, { status: 405 });
  }

  let orderStatuses;
  try {
    orderStatuses = await request.json();
  } catch (error) {
    return json({ message: "Invalid JSON" }, { status: 400 });
  }

  try {
    for (const orderStatus of orderStatuses) {
      const { orderId, productId, replacementId, status } = orderStatus;

      // Update the lineItemStatus in the orderReplacement table based on the conditions
      await prisma.orderReplacement.updateMany({
        where: {
          orderName: orderId,
          originalProductID: productId,
          replacementProductID: replacementId
        },
        data: {
          acceptedDate: new Date(),
          lineItemStatus: status,
          orderStatus: "Accepted"
        },
      });
    }

    return json({ message: "Order statuses updated successfully" });
  } catch (error) {
    return json({ message: "Database update failed", error: error.message }, { status: 500 });
  }
}
