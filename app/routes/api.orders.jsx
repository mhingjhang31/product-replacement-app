import { json } from "@remix-run/node";
import prisma from "../db.server.js";  // Adjust the path to your db.server.js file

export async function loader({ request }) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get('orderId');

  const firstStoreInformation = await prisma.storeInformation.findFirst();

  // Fetch the store information using the ID of the first record
  const storeInformation = await prisma.storeInformation.findUnique({
    where: { id: firstStoreInformation.id },
  });
  
  try {
    const orders = await prisma.orderReplacement.findMany({
      where: {
        orderName: orderId
      }
    });

    if (orders.length === 0) {
      return json({ message: "No orders found for the given orderId" });
    }

    // Check if all orders have an orderStatus
    const anyOrdersAccepted = orders.some(order => order.orderStatus === 'Accepted');
    if (anyOrdersAccepted) {
      return json({ message: "Customer already submitted a response" });
    }

    // Check if the sendDate exceeds 6 hours from the current date-time
    const now = new Date();
    const sixHoursAgo = new Date(now.getTime() - (storeInformation.durationOfEmailExpiration * 60 * 60 * 1000));
    const timeExceeded = orders.some(order => new Date(order.sendDate) < sixHoursAgo);

    if (timeExceeded) {
      return json({ message: "Customer has exceeded the time limit" });
    }

    return json(orders);
  } catch (error) {
    return json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}
