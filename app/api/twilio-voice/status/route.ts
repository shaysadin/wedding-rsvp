/**
 * Twilio Voice Status Webhook
 *
 * Receives call status updates from Twilio (initiated, ringing, answered, completed, etc.)
 * Updates ManualCallLog records with call progress
 *
 * POST /api/twilio-voice/status
 */

import { NextRequest, NextResponse } from "next/server";
import { ManualCallStatus } from "@prisma/client";

import { prisma } from "@/lib/db";

/**
 * Map Twilio call status to our ManualCallStatus enum
 */
function mapTwilioStatus(twilioStatus: string): ManualCallStatus {
  switch (twilioStatus) {
    case "initiated":
    case "queued":
      return ManualCallStatus.INITIATED;
    case "ringing":
      return ManualCallStatus.RINGING;
    case "in-progress":
    case "answered":
      return ManualCallStatus.CONNECTED;
    case "completed":
      return ManualCallStatus.COMPLETED;
    case "busy":
      return ManualCallStatus.BUSY;
    case "no-answer":
      return ManualCallStatus.NO_ANSWER;
    case "failed":
    case "canceled":
      return ManualCallStatus.FAILED;
    default:
      return ManualCallStatus.INITIATED;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Parse form data from Twilio webhook
    const formData = await req.formData();
    const callSid = formData.get("CallSid") as string;
    const callStatus = formData.get("CallStatus") as string;
    const callDuration = formData.get("CallDuration") as string;
    const timestamp = formData.get("Timestamp") as string;

    console.log("Twilio Voice Status Webhook:", {
      callSid,
      callStatus,
      callDuration,
      timestamp,
    });

    if (!callSid) {
      return new NextResponse("Missing CallSid", { status: 400 });
    }

    // Find the call log by Twilio Call SID
    const callLog = await prisma.manualCallLog.findUnique({
      where: { twilioCallSid: callSid },
    });

    if (!callLog) {
      console.warn(`Call log not found for CallSid: ${callSid}`);
      // Return 200 to acknowledge webhook (don't want Twilio to retry)
      return new NextResponse("OK", { status: 200 });
    }

    // Map Twilio status to our status
    const status = mapTwilioStatus(callStatus);

    // Prepare update data
    const updateData: any = {
      status,
    };

    // Update timestamps based on status
    if (status === ManualCallStatus.CONNECTED && !callLog.connectedAt) {
      updateData.connectedAt = new Date();
    }

    if (
      (status === ManualCallStatus.COMPLETED ||
        status === ManualCallStatus.FAILED ||
        status === ManualCallStatus.NO_ANSWER ||
        status === ManualCallStatus.BUSY) &&
      !callLog.endedAt
    ) {
      updateData.endedAt = new Date();
    }

    // Update duration if provided
    if (callDuration && parseInt(callDuration) > 0) {
      updateData.duration = parseInt(callDuration);
    }

    // Update call log
    await prisma.manualCallLog.update({
      where: { id: callLog.id },
      data: updateData,
    });

    console.log(`Updated call log ${callLog.id} to status: ${status}`);

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("Error processing Twilio Voice status webhook:", error);
    // Return 200 to acknowledge webhook (don't want Twilio to retry on our errors)
    return new NextResponse("OK", { status: 200 });
  }
}
