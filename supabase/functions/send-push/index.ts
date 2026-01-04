
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Supabase Edge Function: send-push
 * Triggered by: Database Webhook on "notifications" table INSERT
 */

// Declare Deno to satisfy TypeScript compiler in environments without built-in Deno types
declare const Deno: any;

serve(async (req) => {
  try {
    // 1. Initialize Supabase Client with Service Role Key (to bypass RLS for token fetching)
    // Fixed: Deno global is now recognized through declaration
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY') ?? ''
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 2. Parse the Webhook payload
    // Supabase webhooks send the new row data in the "record" field
    const payload = await req.json()
    const record = payload.record

    if (!record) {
      return new Response(JSON.stringify({ error: 'No record found in payload' }), { status: 400 })
    }

    const { recipient_id, sender_name, type, party_id } = record

    // 3. Fetch the recipient's push token from the users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('push_token, name')
      .eq('id', recipient_id)
      .single()

    if (userError || !user?.push_token) {
      console.log(`No push token found for user ${recipient_id}. Skipping notification.`);
      return new Response(JSON.stringify({ status: 'ignored', message: 'User has no push token' }), { status: 200 })
    }

    // 4. Construct the notification content based on NotificationType
    let title = "Hub Activity";
    let body = "You have a new update in your community.";

    switch (type) {
      case 'FOLLOW':
        title = "New Connection! 👋";
        body = `${sender_name} just followed your card in the Hub.`;
        break;
      case 'FOLLOW_BACK':
        title = "Mutual Engagement! 🤝";
        body = `${sender_name} followed you back. You are now mutuals!`;
        break;
      case 'SYSTEM_WARNING':
        title = "Janitor Alert 🛡️";
        body = "A support gap has been detected in your profile. Please check your activity.";
        break;
      default:
        body = `New activity from ${sender_name}.`;
    }

    // 5. Send request to Firebase Cloud Messaging (Legacy API)
    // Note: Legacy API uses 'to' for the token and 'notification' for the payload
    const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${fcmServerKey}`,
      },
      body: JSON.stringify({
        to: user.push_token,
        notification: {
          title,
          body,
          click_action: 'FLUTTER_NOTIFICATION_CLICK', // For mobile compatibility
          icon: 'stock_ticker_update',
          color: '#4f46e5'
        },
        data: {
          type,
          sender_name,
          party_id,
          url: `https://connector-pro.vercel.app` // Fallback URL
        },
        priority: 'high'
      }),
    })

    const fcmResult = await fcmResponse.json()
    console.log('FCM Response:', fcmResult);

    return new Response(JSON.stringify({ 
      status: 'success', 
      fcm_id: fcmResult.multicast_id || fcmResult.message_id 
    }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    })

  } catch (err) {
    console.error('Edge Function Error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
})
