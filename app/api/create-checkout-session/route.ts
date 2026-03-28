import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-01-27.acacia' as any,
});

export async function POST(req: Request) {
  try {
    const { priceId, userEmail, planId, iotPriceId, iotQuantity } = await req.json();

    if (!priceId) {
      return NextResponse.json({ success: false, message: 'Price ID is required' }, { status: 400 });
    }

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const lineItems: any[] = [
      {
        price: priceId,
        quantity: 1,
      },
    ];

    // Add IoT hardware as a one-time cost if quantity > 0
    if (iotPriceId && iotPriceId !== 'custom' && iotQuantity > 0) {
      lineItems.push({
        price: iotPriceId,
        quantity: iotQuantity,
      });
    }

    // Create Checkout Sessions from body params
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userEmail,
      line_items: lineItems,
      mode: 'subscription',
      subscription_data: {
        trial_period_days: 30,
      },
      success_url: `${origin}/en/auth/signup?payment=success&email=${encodeURIComponent(userEmail)}`,
      cancel_url: `${origin}/en/checkout?canceled=true`,
      metadata: {
        planId: planId,
        iotQuantity: iotQuantity?.toString() || '0',
      },
    });

    return NextResponse.json({ success: true, checkoutUrl: session.url });
  } catch (err: any) {
    console.error('Stripe Checkout Error:', err.message);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
