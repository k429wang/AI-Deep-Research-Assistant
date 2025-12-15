import { google } from 'googleapis';
import nodemailer from 'nodemailer';
import { sanitizeFilename } from './utils';

const USE_MOCK = process.env.USE_MOCK_APIS === 'true';

/**
 * Mock email service for local development
 */
class MockEmailService {
  async sendPDF(email: string, pdfBuffer: Buffer, title: string, sessionId: string): Promise<void> {
    // Simulate email sending
    await new Promise((resolve) => setTimeout(resolve, 500));
    const filename = `${sanitizeFilename(title)} Research Report.pdf`;
    console.log(`📧 [MOCK] Email would be sent to ${email}: "${title}" (${(pdfBuffer.length / 1024).toFixed(2)} KB)`);
  }
}

/**
 * Real email service using Gmail API
 */
class RealEmailService {
  private oauth2Client: any;
  private transporter: nodemailer.Transporter | null = null;
  private clientId: string;
  private clientSecret: string;
  private refreshToken: string;
  private userEmail: string;

  constructor() {
    // Gmail API configuration
    // You can use the same Google OAuth credentials as authentication
    // Just add Gmail API scopes to your OAuth consent screen
    const clientId = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      console.warn('Gmail credentials not configured. Email sending will be disabled.');
      console.warn('Note: You can use the same GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, but you need a refresh token with Gmail API scopes.');
      return;
    }

    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.refreshToken = refreshToken;
    this.userEmail = process.env.GMAIL_USER || process.env.EMAIL_FROM || 'your-email@gmail.com';

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      'urn:ietf:wg:oauth:2.0:oob'
    );
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });

    // Create transporter using Gmail OAuth2
    // In nodemailer v7, we use a function for accessToken to refresh it dynamically
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: this.userEmail,
        clientId: this.clientId,
        clientSecret: this.clientSecret,
        refreshToken: this.refreshToken,
        accessToken: async () => {
          try {
            const { token } = await this.oauth2Client.getAccessToken();
            if (!token) {
              throw new Error('No access token returned from OAuth2 client');
            }
            return token;
          } catch (error: any) {
            const errorMsg = error?.message || 'Unknown error';
            console.error('Gmail API access token error:', errorMsg);
            if (error?.response) {
              console.error('OAuth2 error:', error.response?.status);
            }
            throw new Error(`Failed to get access token: ${errorMsg}`);
          }
        },
      },
    } as nodemailer.TransportOptions);
  }

  async sendPDF(email: string, pdfBuffer: Buffer, title: string, sessionId: string): Promise<void> {
    if (!this.transporter) {
      throw new Error('Email service not configured. Please set Gmail credentials.');
    }

    try {
      // Verify transporter is ready
      await this.transporter.verify();

      // Sanitize title for filename
      const filename = `${sanitizeFilename(title)} Research Report.pdf`;

      const mailOptions = {
        from: this.userEmail,
        to: email,
        subject: `Your Deep Research Report: ${title}`,
        text: `Please find attached your deep research report: ${title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0ea5e9;">Your Deep Research Report is Ready</h2>
            <p>Thank you for using the Multi-API Deep Research Assistant.</p>
            <p>Your research report <strong>"${title}"</strong> is attached to this email.</p>
            <p>The report includes comprehensive research findings from both OpenAI and Google Gemini.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="color: #64748b; font-size: 12px;">
              This is an automated email from the Deep Research Assistant.
            </p>
          </div>
        `,
        attachments: [
          {
            filename,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      };

      await this.transporter.sendMail(mailOptions);
    } catch (error: any) {
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }
}

// Export the appropriate service
export const emailService = USE_MOCK ? new MockEmailService() : new RealEmailService();

