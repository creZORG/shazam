
'use server';

interface ZeptoMailPayload {
  from: { address: string; name: string };
  to: { email_address: { address: string; name: string } }[];
  subject: string;
  htmlbody: string;
}

async function sendZeptoMail(payload: ZeptoMailPayload) {
  const mailAgent = process.env.NEXT_PUBLIC_ZEPTO_MAIL_AGENT;
  const apiKey = process.env.ZEPTO_MAIL_API_KEY;

  if (!mailAgent || !apiKey) {
    console.error('ZeptoMail credentials are not configured in environment variables.');
    return { success: false, error: 'Email service is not configured.' };
  }

  try {
    const response = await fetch(`https://api.zeptomail.com/v1.1/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Zoho-enczapikey ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('ZeptoMail API Error:', data);
      throw new Error(data.message || 'Failed to send email.');
    }
    
    console.log('Email sent successfully via ZeptoMail:', data);
    return { success: true, data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error('Error sending email via ZeptoMail:', errorMessage);
    return { success: false, error: errorMessage };
  }
}


interface TicketEmailPayload {
  to: string;
  attendeeName: string;
  orderId: string;
  eventName: string;
  tickets: { ticketType: string; qrCode: string }[];
}

export async function sendTicketEmail(payload: TicketEmailPayload) {
  const { to, attendeeName, orderId, eventName, tickets } = payload;
  const ticketCenterUrl = `${process.env.NEXT_PUBLIC_APP_URL}/ticket-center?orderId=${orderId}`;

  const emailHtml = `
    <h1>Your Tickets for ${eventName} are Ready!</h1>
    <p>Hi ${attendeeName},</p>
    <p>Thank you for your purchase! You can view, customize, and download your tickets at any time by clicking the button below:</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="${ticketCenterUrl}" style="display: inline-block; padding: 12px 24px; background-color: #f97316; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">View My Tickets</a>
    </p>
    <p>For your records, here is a summary of your tickets:</p>
    <ul>
      ${tickets.map(ticket => `<li><strong>${ticket.ticketType}</strong> (ID: ${ticket.qrCode.substring(0,8)}...)</li>`).join('')}
    </ul>
    <p>Your Order ID is: ${orderId}</p>
    <p>We look forward to seeing you at the event!</p>
  `;

  return sendZeptoMail({
      from: { address: "noreply@naksyetu.com", name: "NaksYetu Tickets" },
      to: [{ email_address: { address: to, name: attendeeName } }],
      subject: `Your Tickets for ${eventName}`,
      htmlbody: emailHtml,
  });
}

interface InviteEmailPayload {
  to: string;
  role: string;
  inviteLink: string;
  listingName?: string;
}

const getRoleBasedTemplate = ({ role, inviteLink, listingName }: Omit<InviteEmailPayload, 'to'>) => {
    const isNightlife = role === 'club';
    const primaryColor = isNightlife ? `hsla(var(--night-primary), 1)` : `hsla(var(--primary), 1)`;
    const accentColor = isNightlife ? `hsla(var(--night-accent), 1)` : `hsla(var(--accent), 1)`;
    const forEventText = listingName ? ` for the event: <strong>${listingName}</strong>` : '';
    const roleText = role.charAt(0).toUpperCase() + role.slice(1);

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; background-color: hsl(var(--background)); color: hsl(var(--foreground)); margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: auto; background-color: hsl(var(--card)); border-radius: 8px; overflow: hidden; border: 1px solid hsl(var(--border)); }
            .header { padding: 40px; text-align: center; background-image: linear-gradient(to right, ${primaryColor}, ${accentColor}); color: white; }
            .content { padding: 30px; }
            .button { display: inline-block; padding: 12px 24px; background-image: linear-gradient(to right, ${primaryColor}, ${accentColor}); color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: hsl(var(--muted-foreground)); }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>You're Invited!</h1>
            </div>
            <div class="content">
                <h2>Join NaksYetu as a ${roleText}</h2>
                <p>Hello,</p>
                <p>You have been invited to join the NaksYetu platform with the role of <strong>${roleText}</strong>${forEventText}.</p>
                <p>To accept your invitation and create your account, please click the button below. This link is valid for the next 24 hours.</p>
                <p style="text-align: center; margin: 30px 0;">
                    <a href="${inviteLink}" class="button">Accept Invitation</a>
                </p>
                <p>If you did not expect this invitation, you can safely ignore this email.</p>
                <p>Best regards,<br/>The NaksYetu Team</p>
            </div>
            <div class="footer">
                &copy; ${new Date().getFullYear()} NaksYetu. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    `;
};


export async function sendInvitationEmail({ to, role, inviteLink, listingName }: InviteEmailPayload) {
   const emailHtml = getRoleBasedTemplate({ role, inviteLink, listingName });

   return sendZeptoMail({
        from: { address: "noreply@naksyetu.com", name: "NaksYetu" },
        to: [{ email_address: { address: to, name: to } }],
        subject: `You have been invited to become a ${role} on NaksYetu`,
        htmlbody: emailHtml,
   });
}

interface SupportReplyPayload {
    to: string;
    ticketId: string;
    replyMessage: string;
}

export async function sendSupportReplyEmail({ to, ticketId, replyMessage }: SupportReplyPayload) {
    const emailHtml = `
        <h1>Re: Your Support Ticket #${ticketId.substring(0, 6)}...</h1>
        <p>A new reply has been added to your support ticket:</p>
        <blockquote style="border-left: 2px solid #ccc; padding-left: 1rem; margin-left: 1rem;">
            ${replyMessage}
        </blockquote>
        <p>You can view the full conversation by logging into your NaksYetu account and visiting the support page.</p>
    `;

    return sendZeptoMail({
        from: { address: "support@naksyetu.com", name: "NaksYetu Support" },
        to: [{ email_address: { address: to, name: to } }],
        subject: `Re: Your Support Ticket #${ticketId.substring(0, 6)}...`,
        htmlbody: emailHtml,
    });
}
