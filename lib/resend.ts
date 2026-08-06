import { Resend } from 'resend';

// Only create the Resend instance if the API key is available
export const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null;
