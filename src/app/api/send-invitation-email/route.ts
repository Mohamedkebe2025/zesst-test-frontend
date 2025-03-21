import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        // Get request body
        const { email, workspaceId, role, workspaceName, existingUser, targetLink } = await request.json();

        if (!email || !workspaceId) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Use the provided targetLink or create a default one
        const invitationLink = targetLink || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/auth/accept-invitation?email=${encodeURIComponent(email)}&workspace_id=${workspaceId}&invite_role=${role || 'member'}&workspace_name=${encodeURIComponent(workspaceName)}`;

        // Prepare the email content with a custom template for initialization
        const emailContent = {
            to: email,
            from: process.env.SENDGRID_FROM_EMAIL || 'info@zesst.ca',
            subject: `Set Up Your Password for ${workspaceName}`,
            text: `You've been invited to join ${workspaceName} as a ${role || 'member'}. Click the link to set up your password: ${invitationLink}`,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #faad14; padding: 20px; text-align: center; color: white;">
                <h1>Set Up Your ZESST Account</h1>
              </div>
              <div style="padding: 20px; border: 1px solid #e8e8e8; border-top: none;">
                <p>Hello,</p>
                <p>You've been invited to join the <strong>${workspaceName}</strong> workspace as a <strong>${role || 'member'}</strong>.</p>
                <p>This is step 1 of 2 in the account setup process:</p>
                <ol>
                  <li><strong>Set up your password</strong> (this email)</li>
                  <li>Confirm your email address (you'll receive another email after completing step 1)</li>
                </ol>
                <p>Click the button below to set up your password:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${invitationLink}" style="background-color: #faad14; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                    Set Up Password
                  </a>
                </div>
                <p>After setting your password, you'll receive a second email to confirm your email address.</p>
                <p>This link will expire in 7 days.</p>
                <p>If you have any questions, please contact your workspace administrator.</p>
                <p>Best regards,<br>The ZESST Team</p>
              </div>
            </div>
          `
        };

        // Send the email using the SendGrid API
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                personalizations: [
                    {
                        to: [{ email }]
                    }
                ],
                from: { email: process.env.SENDGRID_FROM_EMAIL || 'info@zesst.ca', name: 'ZESST' },
                subject: `You've been invited to join ${workspaceName}`,
                content: [
                    {
                        type: 'text/plain',
                        value: emailContent.text
                    },
                    {
                        type: 'text/html',
                        value: emailContent.html
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('SendGrid API error:', errorData);
            return NextResponse.json(
                { success: false, error: 'Failed to send invitation email', details: errorData },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `Invitation sent to ${email}`
        });
    } catch (error) {
        console.error('Invitation email error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to send invitation email' },
            { status: 500 }
        );
    }
}