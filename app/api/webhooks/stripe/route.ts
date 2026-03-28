import Stripe from 'stripe'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

export async function POST(request: Request) {
  const body = await request.text()
  const signature = (await headers()).get('stripe-signature')

  if (!signature || !webhookSecret) {
    console.error('Missing webhook signature or secret')
    return new Response('Missing webhook signature', { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  const supabase = createAdminClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // Extract tenant_id from metadata
        const tenantId = session.metadata?.tenant_id
        if (!tenantId) {
          console.error('No tenant_id in session metadata')
          return new Response('Missing tenant_id', { status: 400 })
        }

        // Create subscription record in Supabase
        const { error } = await supabase
          .from('subscriptions')
          .insert({
            tenant_id: tenantId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            stripe_session_id: session.id,
            plan_name: session.metadata?.plan_name || 'starter',
            status: 'active',
            current_period_start: new Date(session.created * 1000),
            current_period_end: new Date(
              (session.created + 30 * 24 * 60 * 60) * 1000
            ), // 30 days from creation
          })

        if (error) {
          console.error('Error creating subscription:', error)
          return new Response('Error creating subscription', { status: 500 })
        }

        console.log(`Subscription created for tenant: ${tenantId}`)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription

        // Find subscription by stripe_subscription_id and update it
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: subscription.status as string,
            current_period_start: new Date(
              subscription.current_period_start * 1000
            ),
            current_period_end: new Date(subscription.current_period_end * 1000),
          })
          .eq('stripe_subscription_id', subscription.id)

        if (error) {
          console.error('Error updating subscription:', error)
          return new Response('Error updating subscription', { status: 500 })
        }

        console.log(`Subscription updated: ${subscription.id}`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        // Mark subscription as canceled
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            cancel_at: new Date(),
          })
          .eq('stripe_subscription_id', subscription.id)

        if (error) {
          console.error('Error canceling subscription:', error)
          return new Response('Error canceling subscription', { status: 500 })
        }

        console.log(`Subscription canceled: ${subscription.id}`)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500 }
    )
  }
}
