import { AutomationTrigger, RsvpStatus, NotificationLog } from "@prisma/client";
import { TriggerCheckResult } from "./types";

interface GuestTriggerContext {
  guestId: string;
  rsvpStatus?: RsvpStatus;
  lastNotificationSentAt?: Date | null;
  eventDateTime: Date;
  hasTableAssignment: boolean;
  delayHours?: number | null;
}

/**
 * Check if a trigger condition is met for a specific guest
 */
export function checkTriggerCondition(
  trigger: AutomationTrigger,
  context: GuestTriggerContext
): TriggerCheckResult {
  const now = new Date();

  switch (trigger) {
    // Immediate Event-based Triggers
    case "RSVP_SENT":
      return { shouldTrigger: false, reason: "Event-based trigger" };

    case "RSVP_CONFIRMED":
      return { shouldTrigger: false, reason: "Event-based trigger" };

    case "RSVP_DECLINED":
      return { shouldTrigger: false, reason: "Event-based trigger" };

    // Flexible Time-Based Triggers (use delayHours from flow)
    case "NO_RESPONSE_WHATSAPP":
    case "NO_RESPONSE_SMS":
      return checkNoResponse(context, context.delayHours || 24);

    // Legacy NO_RESPONSE (backward compatibility)
    case "NO_RESPONSE":
      return checkNoResponse(context, context.delayHours || 24);

    case "BEFORE_EVENT":
      return checkHoursBeforeEvent(context, context.delayHours || 2);

    case "AFTER_EVENT":
      return checkHoursAfterEvent(context, context.delayHours || 12);

    // Preset Time Triggers
    case "EVENT_DAY_MORNING":
      return checkEventDayMorning(context);

    case "DAY_AFTER_MORNING":
      return checkDayAfterMorning(context);

    // Legacy triggers (backwards compatibility)
    case "NO_RESPONSE_24H":
      return checkNoResponse(context, 24);

    case "NO_RESPONSE_48H":
      return checkNoResponse(context, 48);

    case "NO_RESPONSE_72H":
      return checkNoResponse(context, 72);

    case "EVENT_MORNING":
      return checkEventDayMorning(context);

    case "HOURS_BEFORE_EVENT_2":
      return checkHoursBeforeEvent(context, 2);

    case "DAY_AFTER_EVENT":
      return checkDayAfterMorning(context);

    default:
      return { shouldTrigger: false, reason: "Unknown trigger type" };
  }
}

/**
 * Check if guest hasn't responded within specified hours
 */
function checkNoResponse(
  context: GuestTriggerContext,
  hours: number
): TriggerCheckResult {
  const { rsvpStatus, lastNotificationSentAt } = context;

  // Only trigger for pending RSVPs
  if (rsvpStatus !== "PENDING") {
    return { shouldTrigger: false, reason: "Guest already responded" };
  }

  if (!lastNotificationSentAt) {
    return { shouldTrigger: false, reason: "No notification sent yet" };
  }

  const now = new Date();
  const hoursSinceLastNotification =
    (now.getTime() - lastNotificationSentAt.getTime()) / (1000 * 60 * 60);

  if (hoursSinceLastNotification >= hours) {
    return {
      shouldTrigger: true,
      reason: `${hours} hours passed since last notification`,
    };
  }

  // Schedule for when the condition will be met
  const scheduledFor = new Date(
    lastNotificationSentAt.getTime() + hours * 60 * 60 * 1000
  );

  return {
    shouldTrigger: false,
    reason: `Only ${Math.floor(hoursSinceLastNotification)} hours passed`,
    scheduledFor,
  };
}

/**
 * Check if it's the morning of the event day (9 AM - 10 AM)
 */
function checkEventDayMorning(context: GuestTriggerContext): TriggerCheckResult {
  const { eventDateTime, rsvpStatus } = context;

  // Only send to confirmed guests
  if (rsvpStatus !== "ACCEPTED") {
    return { shouldTrigger: false, reason: "Guest not confirmed" };
  }

  const now = new Date();
  const eventDate = new Date(eventDateTime);

  // Check if today is the event day
  const isEventDay =
    now.getFullYear() === eventDate.getFullYear() &&
    now.getMonth() === eventDate.getMonth() &&
    now.getDate() === eventDate.getDate();

  if (!isEventDay) {
    // Schedule for event morning at 9 AM
    const scheduledFor = new Date(eventDate);
    scheduledFor.setHours(9, 0, 0, 0);
    return {
      shouldTrigger: false,
      reason: "Not the event day",
      scheduledFor,
    };
  }

  // Check if it's between 9 AM and 10 AM
  const hour = now.getHours();
  if (hour >= 9 && hour < 10) {
    return { shouldTrigger: true, reason: "Event day morning (9-10 AM)" };
  }

  return { shouldTrigger: false, reason: "Outside event morning window" };
}

/**
 * Check if it's the day after the event (11 AM - 12 PM)
 */
function checkDayAfterMorning(context: GuestTriggerContext): TriggerCheckResult {
  const { eventDateTime, rsvpStatus } = context;

  // Only send to confirmed guests
  if (rsvpStatus !== "ACCEPTED") {
    return { shouldTrigger: false, reason: "Guest not confirmed" };
  }

  const now = new Date();
  const eventDate = new Date(eventDateTime);

  // Get the day after the event
  const dayAfter = new Date(eventDate);
  dayAfter.setDate(dayAfter.getDate() + 1);
  dayAfter.setHours(0, 0, 0, 0);

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  // Check if today is the day after the event
  const isDayAfter = today.getTime() === dayAfter.getTime();

  if (!isDayAfter) {
    // Schedule for day after at 11 AM
    const scheduledFor = new Date(dayAfter);
    scheduledFor.setHours(11, 0, 0, 0);
    return {
      shouldTrigger: false,
      reason: "Not the day after event",
      scheduledFor,
    };
  }

  // Check if it's between 11 AM and 12 PM
  const hour = now.getHours();
  if (hour >= 11 && hour < 12) {
    return { shouldTrigger: true, reason: "Day after event morning (11-12 AM)" };
  }

  return { shouldTrigger: false, reason: "Outside day-after morning window" };
}

/**
 * Check if it's X hours before the event
 */
function checkHoursBeforeEvent(
  context: GuestTriggerContext,
  hours: number
): TriggerCheckResult {
  const { eventDateTime, rsvpStatus } = context;

  // Only send to confirmed guests
  if (rsvpStatus !== "ACCEPTED") {
    return { shouldTrigger: false, reason: "Guest not confirmed" };
  }

  const now = new Date();
  const eventDate = new Date(eventDateTime);
  const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  // If within the 30-minute window before the target time
  if (hoursUntilEvent <= hours && hoursUntilEvent >= hours - 0.5) {
    return {
      shouldTrigger: true,
      reason: `${hours} hours before event`,
    };
  }

  if (hoursUntilEvent > hours) {
    // Schedule for X hours before event
    const scheduledFor = new Date(eventDate.getTime() - hours * 60 * 60 * 1000);
    return {
      shouldTrigger: false,
      reason: `${Math.floor(hoursUntilEvent)} hours until event`,
      scheduledFor,
    };
  }

  return { shouldTrigger: false, reason: "Past trigger window" };
}

/**
 * Check if it's X hours after the event
 */
function checkHoursAfterEvent(
  context: GuestTriggerContext,
  hours: number
): TriggerCheckResult {
  const { eventDateTime, rsvpStatus } = context;

  // Only send to confirmed guests
  if (rsvpStatus !== "ACCEPTED") {
    return { shouldTrigger: false, reason: "Guest not confirmed" };
  }

  const now = new Date();
  const eventDate = new Date(eventDateTime);
  const hoursSinceEvent = (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60);

  // If within the 30-minute window after the target time
  if (hoursSinceEvent >= hours && hoursSinceEvent <= hours + 0.5) {
    return {
      shouldTrigger: true,
      reason: `${hours} hours after event`,
    };
  }

  if (hoursSinceEvent < hours) {
    // Schedule for X hours after event
    const scheduledFor = new Date(eventDate.getTime() + hours * 60 * 60 * 1000);
    return {
      shouldTrigger: false,
      reason: `${Math.floor(hours - hoursSinceEvent)} hours until trigger`,
      scheduledFor,
    };
  }

  return { shouldTrigger: false, reason: "Past trigger window" };
}

/**
 * Determine when to schedule a time-based trigger
 */
export function calculateScheduledTime(
  trigger: AutomationTrigger,
  eventDateTime: Date,
  lastNotificationSentAt?: Date | null,
  delayHours?: number | null
): Date | null {
  const now = new Date();

  switch (trigger) {
    // Flexible triggers (use delayHours)
    case "NO_RESPONSE_WHATSAPP":
    case "NO_RESPONSE_SMS":
    case "NO_RESPONSE": // Legacy
      if (!lastNotificationSentAt || !delayHours) return null;
      return new Date(lastNotificationSentAt.getTime() + delayHours * 60 * 60 * 1000);

    case "BEFORE_EVENT": {
      if (!delayHours) return null;
      const beforeEvent = new Date(eventDateTime.getTime() - delayHours * 60 * 60 * 1000);
      return beforeEvent > now ? beforeEvent : null;
    }

    case "AFTER_EVENT": {
      if (!delayHours) return null;
      const afterEvent = new Date(eventDateTime.getTime() + delayHours * 60 * 60 * 1000);
      return afterEvent > now ? afterEvent : null;
    }

    // Preset triggers
    case "EVENT_DAY_MORNING":
    case "EVENT_MORNING": {
      const morning = new Date(eventDateTime);
      morning.setHours(9, 0, 0, 0);
      return morning > now ? morning : null;
    }

    case "DAY_AFTER_MORNING":
    case "DAY_AFTER_EVENT": {
      const dayAfter = new Date(eventDateTime);
      dayAfter.setDate(dayAfter.getDate() + 1);
      dayAfter.setHours(11, 0, 0, 0);
      return dayAfter > now ? dayAfter : null;
    }

    // Legacy triggers
    case "NO_RESPONSE_24H":
      if (!lastNotificationSentAt) return null;
      return new Date(lastNotificationSentAt.getTime() + 24 * 60 * 60 * 1000);

    case "NO_RESPONSE_48H":
      if (!lastNotificationSentAt) return null;
      return new Date(lastNotificationSentAt.getTime() + 48 * 60 * 60 * 1000);

    case "NO_RESPONSE_72H":
      if (!lastNotificationSentAt) return null;
      return new Date(lastNotificationSentAt.getTime() + 72 * 60 * 60 * 1000);

    case "HOURS_BEFORE_EVENT_2": {
      const twoHoursBefore = new Date(eventDateTime.getTime() - 2 * 60 * 60 * 1000);
      return twoHoursBefore > now ? twoHoursBefore : null;
    }

    default:
      return null;
  }
}

/**
 * Check if a trigger is event-based (immediate) or time-based (scheduled)
 */
export function isEventBasedTrigger(trigger: AutomationTrigger): boolean {
  return ["RSVP_SENT", "RSVP_CONFIRMED", "RSVP_DECLINED"].includes(trigger);
}

/**
 * Check if a trigger is time-based (requires scheduling)
 */
export function isTimeBasedTrigger(trigger: AutomationTrigger): boolean {
  return !isEventBasedTrigger(trigger);
}

/**
 * Check if a trigger requires a delayHours value
 */
export function requiresDelayHours(trigger: AutomationTrigger): boolean {
  return ["NO_RESPONSE_WHATSAPP", "NO_RESPONSE_SMS", "NO_RESPONSE", "BEFORE_EVENT", "AFTER_EVENT"].includes(trigger);
}
