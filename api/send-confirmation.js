import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { clientName, clientEmail, clientPhone, date, slotName, slotTime, cancelToken, siteUrl } = req.body;

    if (!clientEmail) {
      return res.status(200).json({ success: true, message: 'No email provided, skipping' });
    }

    const cancelUrl = `${siteUrl || 'https://get-fit-with-murali.vercel.app'}/cancel/${cancelToken}`;

    // Send confirmation to client
    const { data, error } = await resend.emails.send({
      from: 'FIT2FLY <onboarding@resend.dev>',
      to: clientEmail,
      subject: `Booking Confirmed - ${slotName} on ${date}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: Arial, sans-serif;">
          <div style="max-width: 500px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #141414 0%, #1a1a1a 100%); border: 1px solid #e63946; border-radius: 12px; padding: 32px; text-align: center;">

              <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 8px 0; letter-spacing: 2px;">
                FIT<span style="color: #e63946;">2</span>FLY
              </h1>
              <p style="color: #a0a0a0; margin: 0 0 30px 0; font-size: 14px;">by Murali</p>

              <div style="background: #22c55e; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-size: 14px; font-weight: bold; margin-bottom: 24px;">
                ✓ BOOKING CONFIRMED
              </div>

              <h2 style="color: #ffffff; font-size: 20px; margin: 0 0 24px 0;">
                Hey ${clientName}!
              </h2>

              <div style="background: #0a0a0a; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <p style="color: #a0a0a0; margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Date</p>
                <p style="color: #ffffff; margin: 0 0 16px 0; font-size: 18px; font-weight: bold;">${date}</p>

                <p style="color: #a0a0a0; margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Time Slot</p>
                <p style="color: #e63946; margin: 0; font-size: 18px; font-weight: bold;">${slotName}</p>
                <p style="color: #a0a0a0; margin: 4px 0 0 0; font-size: 14px;">${slotTime}</p>
              </div>

              <p style="color: #a0a0a0; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                Your gym slot has been reserved. See you at the gym!<br>
                Remember to bring your workout gear and water bottle.
              </p>

              <div style="border-top: 1px solid #2a2a2a; padding-top: 20px; margin-top: 20px;">
                <p style="color: #666666; font-size: 12px; margin: 0 0 16px 0;">
                  Can't make it? Cancel your booking below:
                </p>
                <a href="${cancelUrl}" style="display: inline-block; background: transparent; border: 1px solid #666666; color: #a0a0a0; padding: 10px 24px; border-radius: 4px; text-decoration: none; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
                  Cancel Booking
                </a>
              </div>

            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(200).json({ success: true, data });

  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
