// @ts-nocheck
// ✅ CORRECT IMPORTS
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import admin from 'npm:firebase-admin@11.11.0'

console.log("Function is starting up...")

// ✅ SAFE FIREBASE INITIALIZATION
try {
    const serviceAccount = {
        projectId: Deno.env.get('FIREBASE_PROJECT_ID'),
        clientEmail: Deno.env.get('FIREBASE_CLIENT_EMAIL'),
        privateKey: Deno.env.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
    }

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        })
        console.log("Firebase initialized successfully")
    }
} catch (error) {
    console.error("Critical Error initializing Firebase:", error)
}

serve(async (req) => {
    try {
        // 1. Parse Data
        const payload = await req.json()
        console.log("Received payload:", JSON.stringify(payload))
        console.log("Event Type:", payload.type)
        console.log("Table:", payload.table)

        const record = payload.record // New data
        const oldRecord = payload.old_record // Old data (available on UPDATE)

        let messageContent = ""
        let messageTitle = ""
        let receiverId = ""
        let reportId = ""
        let notificationType = ""

        // LOGIC ROUTER BASED ON TABLE
        if (payload.table === 'tbl_messages') {
            // --- CHAT MESSAGE LOGIC ---
            // Support both webhook fields and direct test fields
            messageContent = record.content || record.message_content || "New Message"
            receiverId = record.receiver_id
            reportId = record.report_id || ""
            messageTitle = "New Message"
            notificationType = "message"

            if (!receiverId) {
                console.error("Missing receiver_id in message")
                return new Response(JSON.stringify({ error: "No receiver_id provided" }), { headers: { 'Content-Type': 'application/json' } })
            }

        } else if (payload.table === 'tbl_reports') {
            // --- REPORT STATUS UPDATE LOGIC ---
            // Only run if status changed
            if (payload.type === 'UPDATE' && record.status === oldRecord?.status) {
                console.log("Status did not change, skipping notification.")
                return new Response(JSON.stringify({ message: "No status change" }), { headers: { 'Content-Type': 'application/json' } })
            }

            // Only notify if status is meaningful (optional filter)
            receiverId = record.reporter_id || record.user_id // The user who created the report (using reporter_id based on schema)
            reportId = record.report_id
            messageTitle = "Case Status Update"
            messageContent = `Your report status has been updated to: ${record.status}`
            notificationType = "status_update"

            if (!receiverId) {
                console.error("Missing reporter_id/user_id in report")
                return new Response(JSON.stringify({ error: "No reporter_id provided in report" }), { headers: { 'Content-Type': 'application/json' } })
            }
        } else {
            // Fallback or unknown table
            console.log("Unknown table event:", payload.table)
            return new Response(JSON.stringify({ message: "Table not handled" }), { headers: { 'Content-Type': 'application/json' } })
        }

        // 2. Connect to Supabase
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 3. Get User Token
        const { data: user, error: userError } = await supabase
            .from('tbl_users')
            .select('fcm_token')
            .eq('user_id', receiverId)
            .single()

        if (userError || !user || !user.fcm_token) {
            console.error("Token not found for user:", receiverId)
            return new Response(JSON.stringify({ error: "User has no token" }), {
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // 4. Send Notification
        const message = {
            token: user.fcm_token,
            notification: {
                title: messageTitle,
                body: messageContent,
            },
            android: {
                notification: {
                    channelId: 'messages_v2', // Use the channel with custom sound
                    sound: 'alert_sound',
                },
            },
            data: {
                report_id: reportId,
                type: notificationType,
                status: record.status || "", // Include status in data for app handling
            }
        }

        const response = await admin.messaging().send(message)
        console.log("Notification sent:", response)

        return new Response(JSON.stringify({ success: true, messageId: response }), {
            headers: { 'Content-Type': 'application/json' },
        })

    } catch (err) {
        console.error("Runtime Error:", err)
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
})
