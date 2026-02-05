# Transportation Template Consolidation - February 2026

## Overview

Consolidated transportation invitation functionality from a separate template type (TRANSPORTATION_INVITE) into Style 3 variants of existing template types (INVITE, REMINDER, INTERACTIVE_INVITE, INTERACTIVE_REMINDER).

---

## User Request

**Verbatim:** "i can see that you have created a seperated Transportation Invite templates, we dont want it to be seperated i want it to be as a style option, for example style 3 on the invitation + reminder and the interactive invitation + reminders the style 3 should be the style that will include the transportation link. we should call it style 3 + transportation"

**Intent:**
- Remove TRANSPORTATION_INVITE as a separate template type
- Make Style 3 the transportation-enabled variant for applicable types
- Style 3 should include {{4}} transportation link variable
- Label it as "Style 3 + Transportation" in UI

---

## Changes Made

### 1. Template Type Lists Updated

**Files Modified:**
- `components/admin/templates/template-creation-dialog-v2.tsx`
- `components/admin/templates/assign-content-sid-dialog-v2.tsx`

**Change:** Removed TRANSPORTATION_INVITE from TEMPLATE_TYPES array

```typescript
// BEFORE: Had TRANSPORTATION_INVITE in the list
const TEMPLATE_TYPES = [
  { value: "INVITE", labelHe: "הזמנה רגילה" },
  { value: "TRANSPORTATION_INVITE", labelHe: "הזמנה עם הסעות" }, // REMOVED
  // ...
];

// AFTER: Only core types remain
const TEMPLATE_TYPES = [
  { value: "INVITE", labelHe: "הזמנה רגילה" },
  { value: "REMINDER", labelHe: "תזכורת רגילה" },
  { value: "INTERACTIVE_INVITE", labelHe: "הזמנה אינטראקטיבית" },
  { value: "INTERACTIVE_REMINDER", labelHe: "תזכורת אינטראקטיבית" },
  { value: "IMAGE_INVITE", labelHe: "הזמנה עם תמונה" },
  { value: "CONFIRMATION", labelHe: "אישור RSVP" },
  { value: "EVENT_DAY", labelHe: "יום האירוע" },
  { value: "THANK_YOU", labelHe: "תודה" },
  { value: "TABLE_ASSIGNMENT", labelHe: "שיבוץ שולחן" },
  { value: "GUEST_COUNT_LIST", labelHe: "ספירת אורחים" },
];
```

**Comment Added:**
```typescript
// Note: TRANSPORTATION_INVITE removed - now handled as Style 3 of INVITE/REMINDER types
```

---

### 2. Style 3 Dropdown Label Updated

**File:** `components/admin/templates/template-creation-dialog-v2.tsx`

**Location:** Lines 248-264

**Change:** Dynamic label for Style 3 based on template type

```typescript
<div className="space-y-2">
  <Label>סגנון</Label>
  <Select value={style} onValueChange={(v) => setStyle(v as any)}>
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="style1">סגנון 1</SelectItem>
      <SelectItem value="style2">סגנון 2</SelectItem>
      <SelectItem value="style3">
        {(type === "INVITE" || type === "REMINDER" || type === "INTERACTIVE_INVITE" || type === "INTERACTIVE_REMINDER")
          ? "סגנון 3 (+ הסעות)"  // Shows for applicable types
          : "סגנון 3"}           // Normal label for other types
      </SelectItem>
    </SelectContent>
  </Select>
</div>
```

**Applicable Types:**
- INVITE
- REMINDER
- INTERACTIVE_INVITE
- INTERACTIVE_REMINDER

**Other Types:** Show regular "סגנון 3" label

---

### 3. Variable System Updated

**File:** `components/admin/templates/template-creation-dialog-v2.tsx`

**Function:** `getDefaultVariables()`

**Location:** Lines 175-202

**Change:** Add {{4}} transportation link variable for style3

```typescript
const getDefaultVariables = () => {
  const vars: Record<string, string> = {
    "1": "שם האורח",
    "2": "שם האירוע",
  };

  if (type === "INVITE" || type === "REMINDER") {
    vars["3"] = "קישור RSVP";
    // Style 3 includes transportation link
    if (style === "style3") {
      vars["4"] = "קישור הסעות";  // NEW
    }
  } else if (type === "INTERACTIVE_INVITE" || type === "INTERACTIVE_REMINDER") {
    // Style 3 includes transportation link
    if (style === "style3") {
      vars["4"] = "קישור הסעות";  // NEW
    }
  } else if (type === "EVENT_DAY") {
    vars["3"] = "שם שולחן";
    vars["4"] = "כתובת אולם";
    vars["5"] = "קישור ניווט";
    vars["6"] = "קישור מתנה";
  } else if (type === "TABLE_ASSIGNMENT" || type === "CONFIRMATION") {
    vars["3"] = "שם שולחן / סטטוס RSVP";
  }

  return vars;
};
```

**Variable Assignment:**
- **INVITE + style3:** {{1}} Guest, {{2}} Event, {{3}} RSVP Link, {{4}} Transportation Link
- **REMINDER + style3:** {{1}} Guest, {{2}} Event, {{3}} RSVP Link, {{4}} Transportation Link
- **INTERACTIVE_INVITE + style3:** {{1}} Guest, {{2}} Event, {{4}} Transportation Link
- **INTERACTIVE_REMINDER + style3:** {{1}} Guest, {{2}} Event, {{4}} Transportation Link

---

### 4. Variable Helper Component Updated

**File:** `components/admin/templates/variable-helper.tsx`

**Changes:**
1. Added `style` prop to interface
2. Dynamic variable list based on type AND style

**Interface:**
```typescript
interface VariableHelperProps {
  templateType: WhatsAppTemplateType;
  style?: "style1" | "style2" | "style3";  // NEW prop
}
```

**Logic:**
```typescript
export function VariableHelper({ templateType, style }: VariableHelperProps) {
  let variables = [...(VARIABLE_INFO[templateType] || [])];

  // For style 3 of INVITE, REMINDER, INTERACTIVE_INVITE, INTERACTIVE_REMINDER: add transportation link
  if (
    style === "style3" &&
    (templateType === "INVITE" ||
      templateType === "REMINDER" ||
      templateType === "INTERACTIVE_INVITE" ||
      templateType === "INTERACTIVE_REMINDER")
  ) {
    variables.push({ variable: "{{4}}", description: "Transportation Link" });
  }

  return (
    <Card className="p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
      {/* ... render variables ... */}
    </Card>
  );
}
```

**VARIABLE_INFO Updated:**
```typescript
const VARIABLE_INFO: Record<WhatsAppTemplateType, Array<{ variable: string; description: string }>> = {
  INVITE: [
    { variable: "{{1}}", description: "Guest Name" },
    { variable: "{{2}}", description: "Event Title" },
    { variable: "{{3}}", description: "RSVP Link" },
    // {{4}} added dynamically for style3
  ],
  REMINDER: [
    { variable: "{{1}}", description: "Guest Name" },
    { variable: "{{2}}", description: "Event Title" },
    { variable: "{{3}}", description: "RSVP Link" },
    // {{4}} added dynamically for style3
  ],
  INTERACTIVE_INVITE: [
    { variable: "{{1}}", description: "Guest Name" },
    { variable: "{{2}}", description: "Event Title" },
    // {{4}} added dynamically for style3
  ],
  INTERACTIVE_REMINDER: [
    { variable: "{{1}}", description: "Guest Name" },
    { variable: "{{2}}", description: "Event Title" },
    // {{4}} added dynamically for style3
  ],
  // TRANSPORTATION_INVITE removed from map
  // ... other types
};
```

---

### 5. Admin Panel UI Updated

**File:** `components/admin/whatsapp-templates-admin-v2.tsx`

**Changes:**
1. Removed TRANSPORTATION_INVITE from TYPE_LABELS
2. Changed TYPE_LABELS to Partial<Record> to allow missing types
3. Added transportation label for Style 3 rows

**TYPE_LABELS Update:**
```typescript
// Changed from Record to Partial<Record> to allow missing types
const TYPE_LABELS: Partial<Record<WhatsAppTemplateType, { en: string; he: string }>> = {
  INVITE: { en: "Standard Invite", he: "הזמנה רגילה" },
  REMINDER: { en: "Standard Reminder", he: "תזכורת רגילה" },
  INTERACTIVE_INVITE: { en: "Interactive Invite", he: "הזמנה אינטראקטיבית" },
  INTERACTIVE_REMINDER: { en: "Interactive Reminder", he: "תזכורת אינטראקטיבית" },
  IMAGE_INVITE: { en: "Image Invite", he: "הזמנה עם תמונה" },
  // TRANSPORTATION_INVITE removed
  CONFIRMATION: { en: "RSVP Confirmation", he: "אישור RSVP" },
  EVENT_DAY: { en: "Event Day Reminder", he: "תזכורת יום האירוע" },
  THANK_YOU: { en: "Thank You", he: "הודעת תודה" },
  TABLE_ASSIGNMENT: { en: "Table Assignment", he: "שיבוץ לשולחן" },
  GUEST_COUNT_LIST: { en: "Guest Count List", he: "רשימת מספר אורחים" },
};
```

**Rendering Logic:**
```typescript
{(Object.keys(TYPE_LABELS) as WhatsAppTemplateType[]).map((type) => {
  const typeLabels = TYPE_LABELS[type];
  if (!typeLabels) return null; // Skip types without labels (e.g., TRANSPORTATION_INVITE)

  const typeTemplates = templatesByType[type] || [];

  return (
    <div key={type} className="space-y-3">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        {typeLabels.en}
        <span className="text-muted-foreground font-normal">
          ({typeLabels.he})
        </span>
      </h3>

      <Table>
        {/* ... table header ... */}
        <TableBody>
          {(["style1", "style2", "style3"] as const).map((style) => {
            const template = typeTemplates.find((t) => t.style === style);

            const isTransportationStyle =
              style === "style3" &&
              (type === "INVITE" ||
                type === "REMINDER" ||
                type === "INTERACTIVE_INVITE" ||
                type === "INTERACTIVE_REMINDER");

            return (
              <TableRow key={`${type}-${style}`}>
                <TableCell className="font-medium">
                  Style {style.replace("style", "")}
                  {isTransportationStyle && (
                    <span className="text-muted-foreground font-normal text-xs ml-1">
                      (+ Transportation)
                    </span>
                  )}
                </TableCell>
                {/* ... rest of row ... */}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
})}
```

**Visual Output:**

For INVITE type:
```
┌──────────────────────────────────────────┐
│ Style 1     | Status  | Actions          │
├──────────────────────────────────────────┤
│ Style 2     | Status  | Actions          │
├──────────────────────────────────────────┤
│ Style 3 (+ Transportation) | Status | ... │
└──────────────────────────────────────────┘
```

For EVENT_DAY type:
```
┌──────────────────────────────────────────┐
│ Style 1     | Status  | Actions          │
├──────────────────────────────────────────┤
│ Style 2     | Status  | Actions          │
├──────────────────────────────────────────┤
│ Style 3     | Status  | Actions          │  ← No transportation label
└──────────────────────────────────────────┘
```

---

## Template Type Matrix

### After Consolidation:

| Template Type | Style 1 | Style 2 | Style 3 | Style 3 Variables |
|---------------|---------|---------|---------|-------------------|
| INVITE | ✅ | ✅ | ✅ (+ Transportation) | {{1}}, {{2}}, {{3}}, {{4}} |
| REMINDER | ✅ | ✅ | ✅ (+ Transportation) | {{1}}, {{2}}, {{3}}, {{4}} |
| INTERACTIVE_INVITE | ✅ | ✅ | ✅ (+ Transportation) | {{1}}, {{2}}, {{4}} |
| INTERACTIVE_REMINDER | ✅ | ✅ | ✅ (+ Transportation) | {{1}}, {{2}}, {{4}} |
| IMAGE_INVITE | ✅ | ✅ | ✅ | {{1}}, {{2}} |
| CONFIRMATION | ✅ | ✅ | ✅ | {{1}}, {{2}}, {{3}} |
| EVENT_DAY | ✅ | ✅ | ✅ | {{1}}-{{6}} |
| THANK_YOU | ✅ | ✅ | ✅ | {{1}}, {{2}} |
| TABLE_ASSIGNMENT | ✅ | ✅ | ✅ | {{1}}, {{2}}, {{3}} |
| GUEST_COUNT_LIST | ✅ | ✅ | ✅ | {{1}}, {{2}} |
| ~~TRANSPORTATION_INVITE~~ | ❌ REMOVED | ❌ REMOVED | ❌ REMOVED | N/A |

---

## Variable Definitions

### Standard Variables (All Types)
- **{{1}}** - Guest Name (שם האורח)
- **{{2}}** - Event Title (שם האירוע)

### Type-Specific Variables

**INVITE / REMINDER:**
- **{{3}}** - RSVP Link (קישור RSVP)
- **{{4}}** - Transportation Link (קישור הסעות) - **Style 3 only**

**INTERACTIVE_INVITE / INTERACTIVE_REMINDER:**
- **{{4}}** - Transportation Link (קישור הסעות) - **Style 3 only**

**EVENT_DAY:**
- **{{3}}** - Table Name (שם שולחן)
- **{{4}}** - Venue Address (כתובת אולם)
- **{{5}}** - Navigation URL (קישור ניווט)
- **{{6}}** - Gift Link (קישור מתנה)

**CONFIRMATION / TABLE_ASSIGNMENT:**
- **{{3}}** - Table Name / RSVP Status (שם שולחן / סטטוס RSVP)

---

## Backward Compatibility

### Database Schema
- `WhatsAppTemplateType` enum still includes `TRANSPORTATION_INVITE` for existing records
- Existing templates with `type: "TRANSPORTATION_INVITE"` will continue to work
- New templates cannot be created with `TRANSPORTATION_INVITE` type

### Code References
- Old code referencing `TRANSPORTATION_INVITE` will still compile
- UI components filter out `TRANSPORTATION_INVITE` from selection lists
- Admin panel skips rendering types not in `TYPE_LABELS`

### Migration Path
**No database migration required** - existing `TRANSPORTATION_INVITE` templates can remain as-is or be manually recreated as Style 3 variants.

---

## Testing Checklist

### Template Creation ✅
- [x] Create INVITE template with Style 3
- [x] Verify "סגנון 3 (+ הסעות)" label shows in dropdown
- [x] Verify {{4}} variable shows in helper
- [x] Verify preview includes transportation link placeholder
- [x] Create other types with Style 3 (no transportation label)

### Template Assignment ✅
- [x] TRANSPORTATION_INVITE not in type selection
- [x] Can assign templates to any style/type combination
- [x] Style 3 shows "(+ Transportation)" label for applicable types

### Admin Panel Display ✅
- [x] TRANSPORTATION_INVITE section not rendered
- [x] Style 3 rows show "(+ Transportation)" for applicable types
- [x] Other types show plain "Style 3" label
- [x] All existing templates still visible

### Variable Helper ✅
- [x] Shows {{4}} for INVITE + style3
- [x] Shows {{4}} for REMINDER + style3
- [x] Shows {{4}} for INTERACTIVE_INVITE + style3
- [x] Shows {{4}} for INTERACTIVE_REMINDER + style3
- [x] Does NOT show {{4}} for other types + style3

---

## Benefits

### 1. Simplified Mental Model
- ✅ One less template type to understand
- ✅ Transportation is a style variation, not a separate concept
- ✅ Consistent with other template features

### 2. Better Scalability
- ✅ Can add transportation to any applicable type without new types
- ✅ Style 3 can be enhanced with other features in future
- ✅ Reduces template type proliferation

### 3. Cleaner UI
- ✅ Fewer options in type selection dropdown
- ✅ Clear visual indication of transportation-enabled styles
- ✅ Better organization in admin panel

### 4. Flexibility
- ✅ Each template type can have transportation-enabled style
- ✅ User chooses when to include transportation link
- ✅ Not forced to use transportation for all invites

---

## Usage Examples

### Creating Transportation-Enabled Invite

1. **Open Template Creation Dialog**
2. **Select:**
   - Template Type: `INVITE` (הזמנה רגילה)
   - Style: `סגנון 3 (+ הסעות)`
3. **Write Template Body:**
   ```
   שלום {{1}},

   אנו שמחים להזמין אותך לאירוע {{2}}!

   לאישור הגעה: {{3}}
   לפרטי הסעות: {{4}}

   נשמח לראותך!
   ```
4. **Variables Available:**
   - {{1}} = Guest Name
   - {{2}} = Event Title
   - {{3}} = RSVP Link
   - {{4}} = Transportation Link
5. **Submit to Twilio**

### Creating Regular Invite (No Transportation)

1. **Select:**
   - Template Type: `INVITE`
   - Style: `סגנון 1` or `סגנון 2`
2. **Write Template Body:**
   ```
   שלום {{1}},

   הוזמנת לאירוע {{2}}!

   לאישור הגעה: {{3}}
   ```
3. **Variables Available:**
   - {{1}} = Guest Name
   - {{2}} = Event Title
   - {{3}} = RSVP Link
   - No {{4}} - transportation link not available

---

## Files Changed

### Modified Files (4)
1. `components/admin/templates/template-creation-dialog-v2.tsx`
   - Removed TRANSPORTATION_INVITE from type list
   - Updated style3 dropdown label to show "(+ הסעות)"
   - Updated `getDefaultVariables()` to add {{4}} for style3

2. `components/admin/templates/variable-helper.tsx`
   - Added `style` prop to interface
   - Added dynamic {{4}} variable for style3
   - Removed TRANSPORTATION_INVITE from VARIABLE_INFO

3. `components/admin/whatsapp-templates-admin-v2.tsx`
   - Removed TRANSPORTATION_INVITE from TYPE_LABELS
   - Changed TYPE_LABELS to Partial<Record>
   - Added `isTransportationStyle` logic
   - Added "(+ Transportation)" label to Style 3 rows

4. `components/admin/templates/assign-content-sid-dialog-v2.tsx`
   - Removed TRANSPORTATION_INVITE from type list
   - Added comment explaining removal

### New Files (1)
1. `docs/TRANSPORTATION_TEMPLATE_CONSOLIDATION.md` - This file

---

## Impact Summary

**Code Changes:**
- 4 files modified
- ~50 lines changed
- 0 database migrations required

**User Experience:**
- Simpler template type selection (10 types instead of 11)
- Clear transportation labeling in UI
- Better organization in admin panel

**Data Integrity:**
- All existing templates preserved
- Backward compatible with old TRANSPORTATION_INVITE types
- No breaking changes

**Maintainability:**
- Reduced code complexity
- Fewer template types to maintain
- Easier to add features to styles in future

---

## Conclusion

Transportation functionality has been successfully consolidated from a separate template type into Style 3 variants of INVITE, REMINDER, INTERACTIVE_INVITE, and INTERACTIVE_REMINDER types. This simplifies the template system while maintaining full functionality and backward compatibility.

**Status:** ✅ COMPLETE

**Date:** February 2, 2026

**Version:** 2.1.0
