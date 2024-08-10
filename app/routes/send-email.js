import { json } from '@remix-run/node';
import { Resend } from 'resend';

export const action = async ({ request }) => {
  try {
    const resend = new Resend('re_HvAuPbit_PamwoGjWHEVkorxqXAF62p44');
    const body = await request.json();

    const response = await resend.emails.send({
      from: 'Acme <onboarding@resend.dev>',
      to: [body.to],
      subject: body.subject,
      html: body.html,
    });

    if (!response.success) {
      return json({ error: response.message }, { status: 400 });
    }

    return json({ success: true, data: response });
  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }
};
