
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
      <a href="${ticketCenterUrl}" style="display: inline-block; padding: 12px 24px; background-color: #E76F51; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">View My Tickets</a>
    </p>
    <p>For your records, here is a summary of your tickets:</p>
    <ul>
      ${tickets.map(ticket => `<li><strong>${ticket.ticketType}</strong> (ID: ${ticket.qrCode.substring(0,8)}...)</li>`).join('')}
    </ul>
    <p>Your Order ID is: ${orderId}</p>
    <p>We look forward to seeing you at the event!</p>
  `;

  return sendZeptoMail({
      from: { address: "noreply@mov33.com", name: "Mov33 Tickets" },
      to: [{ email_address: { address: to, name: attendeeName } }],
      subject: `Your Tickets for ${eventName}`,
      htmlbody: emailHtml,
  });
}

interface InviteEmailPayload {
  to: string;
  name?: string;
  role: string;
  inviteLink: string;
  listingName?: string;
}

const getRoleBasedTemplate = ({ role, inviteLink, listingName, name }: Omit<InviteEmailPayload, 'to'>) => {
    const isNightlife = role === 'club';
    const primaryColor = isNightlife ? `hsla(260, 100%, 60%, 1)` : `hsla(14, 83%, 58%, 1)`;
    const accentColor = isNightlife ? `hsla(320, 100%, 55%, 1)` : `hsla(25, 95%, 53%, 1)`;
    const forEventText = listingName ? ` for the event: <strong>${listingName}</strong>` : '';
    const roleText = role.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; color: #333; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #ddd; }
            .header { padding: 40px; text-align: center; background-image: linear-gradient(to right, ${primaryColor}, ${accentColor}); color: white; }
            .content { padding: 30px; }
            .button { display: inline-block; padding: 12px 24px; background-image: linear-gradient(to right, ${primaryColor}, ${accentColor}); color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #777; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>You're Invited!</h1>
            </div>
            <div class="content">
                <h2>Join Mov33 as a ${roleText}</h2>
                <p>Hello ${name || ''},</p>
                <p>You have been invited to join the Mov33 platform with the role of <strong>${roleText}</strong>${forEventText}.</p>
                <p>To accept your invitation and create your account, please click the button below. This link is valid for the next 24 hours. Once you accept, you will be redirected to a helpful guide to get you started.</p>
                <p style="text-align: center; margin: 30px 0;">
                    <a href="${inviteLink}" class="button">Accept Invitation</a>
                </p>
                <p>If you did not expect this invitation, you can safely ignore this email.</p>
                <p>Best regards,<br/>The Mov33 Team</p>
            </div>
            <div class="footer">
                &copy; ${new Date().getFullYear()} Mov33. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    `;
};


export async function sendInvitationEmail({ to, name, role, inviteLink, listingName }: InviteEmailPayload) {
   const emailHtml = getRoleBasedTemplate({ name, role, inviteLink, listingName });

   return sendZeptoMail({
        from: { address: "noreply@mov33.com", name: "Mov33" },
        to: [{ email_address: { address: to, name: name || to } }],
        subject: `You have been invited to become a ${role} on Mov33`,
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
        <p>You can view the full conversation by logging into your Mov33 account and visiting the support page.</p>
    `;

    return sendZeptoMail({
        from: { address: "support@mov33.com", name: "Mov33 Support" },
        to: [{ email_address: { address: to, name: to } }],
        subject: `Re: Your Support Ticket #${ticketId.substring(0, 6)}...`,
        htmlbody: emailHtml,
    });
}


interface WelcomeEmailPayload {
  to: string;
  name: string;
}

export async function sendWelcomeEmail({ to, name }: WelcomeEmailPayload) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mov33.com";
  const exploreUrl = `${appUrl}/events`;
  const emailHtml = `
    <h1>Welcome to Mov33, ${name}!</h1>
    <p>We're thrilled to have you join the community. Mov33 is your one-stop platform for the best events, tours, and nightlife in Nakuru.</p>
    <h2>What's next?</h2>
    <p>Start by exploring the amazing experiences waiting for you:</p>
     <p style="text-align: center; margin: 30px 0;">
      <a href="${exploreUrl}" style="display: inline-block; padding: 12px 24px; background-color: #E76F51; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Explore Events</a>
    </p>
    <p>If you're an organizer, influencer, or club owner, check out our <a href="${appUrl}/partner-with-us">Partners Page</a> to see how you can benefit from our platform.</p>
    <p>Enjoy the vibes!</p>
  `;

  return sendZeptoMail({
    from: { address: "noreply@mov33.com", name: "Mov33" },
    to: [{ email_address: { address: to, name: name } }],
    subject: `Welcome to Mov33, ${name}!`,
    htmlbody: emailHtml,
  });
}

interface OtpEmailPayload {
  to: string;
  otp: string;
}

export async function sendOtpEmail({ to, otp }: OtpEmailPayload) {
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
        <h2>Your Mov33 Verification Code</h2>
        <p>Please use the following code to complete your login. This code is valid for 10 minutes.</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; padding: 10px; background-color: #f2f2f2; border-radius: 5px;">${otp}</p>
        <p>If you did not request this code, please ignore this email.</p>
    </div>
  `;

  return sendZeptoMail({
    from: { address: "security@mov33.com", name: "Mov33 Security" },
    to: [{ email_address: { address: to, name: to } }],
    subject: "Your Mov33 Verification Code",
    htmlbody: emailHtml,
  });
}
