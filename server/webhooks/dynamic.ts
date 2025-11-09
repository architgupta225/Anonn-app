import { Request, Response } from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

interface WalletCreatedWebhook {
  eventId: string;
  webhookId: string;
  environmentId: string;
  data: {
    publicKey: string;
    lowerPublicKey: string;
    userId: string;
    provider: string;
    walletBookName: string;
    createdAt: string;
    updatedAt: string;
  };
  eventName: string;
  userId: string;
  timestamp: string;
}

export async function handleDynamicWebhook(req: Request, res: Response) {
  try {
    const webhookSecret = process.env.DYNAMIC_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('DYNAMIC_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    // Verify webhook signature
    const signature = req.headers['x-dynamic-signature-256'] as string;
    if (!signature) {
      console.error('Missing webhook signature');
      return res.status(401).json({ error: 'Missing signature' });
    }

    const body = JSON.stringify(req.body);
    const expectedSignature = `sha256=${crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex')}`;

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const webhookData = req.body as WalletCreatedWebhook;
    
    // Handle wallet.created event
    if (webhookData.eventName === 'wallet.created') {
      console.log('Processing wallet.created webhook:', {
        userId: webhookData.userId,
        walletAddress: webhookData.data.lowerPublicKey ? 'present' : 'missing',
        provider: webhookData.data.provider
      });

      // Update user with wallet address
      await db
        .update(users)
        .set({
          walletAddress: webhookData.data.lowerPublicKey,
          updatedAt: new Date(),
        })
        .where(eq(users.id, webhookData.userId));

      console.log('✅ Updated user wallet address:', {
        userId: webhookData.userId,
        walletAddress: 'updated'
      });
    }

    // Return success response
    res.json({
      received: true,
      id: webhookData.userId,
      type: webhookData.eventName,
      fields: ['walletAddress', 'updatedAt'],
      updated: true,
      existed: true
    });

  } catch (error) {
    console.error('Error processing Dynamic webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
