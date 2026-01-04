# Invitation Generation System - Complete Documentation

> **See also**:
> - `CLAUDE.md` - Project context and tech stack overview
> - `docs/architecture.md` - System architecture and module boundaries
> - `docs/current-state.md` - Current implementation status
> - `docs/decisions.md` - Architectural decisions and rationale

## Overview

The invitation generation system allows:
1. **Platform Owner** to upload PDF invitation templates (complete designs with text)
2. **Wedding Owners** to generate custom invitations by filling in their details
3. **System** to intelligently erase original text and overlay new text with matching fonts

## Architecture

### Database Schema

#### InvitationTemplate
- `templateType`: HTML or PDF
- `pdfUrl`: Original PDF file (for PDF templates)
- `backgroundImageUrl`: Clean background PNG (text regions erased)
- `thumbnailUrl`: Preview image
- `htmlContent`: HTML template (for HTML templates)
- `cssContent`: CSS styles (for HTML templates)
- `width` / `height`: Dimensions in pixels
- `fields`: Related template fields

#### InvitationTemplateField
- `fieldType`: Enum (COUPLE_NAMES, EVENT_DATE, VENUE_NAME, etc.)
- `label` / `labelHe`: Field labels (English/Hebrew)
- CSS positioning properties:
  - `fontSize`, `fontFamily`, `fontWeight`
  - `textColor`, `textAlign`
  - `top`, `left`, `width`, `maxWidth`
  - `lineHeight`, `letterSpacing`

#### GeneratedInvitation
- `weddingEventId`: Which event this invitation belongs to
- `templateId`: Which template was used
- `pngUrl`: Generated PNG URL
- `pdfUrl`: Optional PDF URL (future feature)
- `fieldValues`: JSON array of field values used

### Core Libraries

#### 1. PDF to PNG Converter (`lib/invitations/pdf-to-png.ts`)

```typescript
import { pdfToPng, getPdfDimensions } from '@/lib/invitations';

// Convert PDF buffer to PNG
const pngBuffer = await pdfToPng(pdfBuffer, {
  scale: 2  // 2x resolution for high quality
});

// Get PDF dimensions
const { width, height } = await getPdfDimensions(pdfBuffer);
```

**Key Features:**
- Uses pdf-lib for parsing PDF structure
- Uses sharp for high-quality image conversion
- Supports custom scaling for retina displays
- Returns Buffer for further processing

#### 2. Image Processor (`lib/invitations/image-processor.ts`)

```typescript
import { smartEraseTextRegions, TextRegion } from '@/lib/invitations';

const textRegions: TextRegion[] = [
  { top: 100, left: 200, width: 400, height: 50 },  // Couple names
  { top: 300, left: 150, width: 500, height: 40 },  // Event date
];

// Intelligently erase text regions
const cleanBackground = await smartEraseTextRegions(pngBuffer, textRegions);
```

**Key Features:**
- `eraseTextRegions`: Simple white box overlay
- `smartEraseTextRegions`: Samples surrounding pixels and fills with matching color
- No visible white boxes on colored backgrounds
- Handles complex backgrounds (gradients, patterns)

#### 3. HTML to PNG Renderer (`lib/invitations/html-to-png.ts`)

```typescript
import { htmlToPng } from '@/lib/invitations';

const pngBuffer = await htmlToPng(html, {
  width: 800,
  height: 1200,
  css: customStyles
});
```

**Key Features:**
- Uses Puppeteer headless browser
- Singleton browser instance for performance
- 2x device scale factor for high quality
- Waits for images/fonts to load before capturing
- Supports custom CSS and fonts

#### 4. Invitation Generator (`lib/invitations/generator.ts`)

```typescript
import { generateInvitation, validateFieldValues, FieldValue } from '@/lib/invitations';

const fieldValues: FieldValue[] = [
  { fieldType: 'COUPLE_NAMES_ENGLISH', value: 'John & Jane' },
  { fieldType: 'EVENT_DATE', value: '2026-06-15' },
];

// Validate before generation
const validation = validateFieldValues(template, fieldValues);
if (!validation.valid) {
  console.error('Missing fields:', validation.missingFields);
}

// Generate PNG
const pngBuffer = await generateInvitation({
  template,
  fieldValues
});
```

**Key Features:**
- Supports both HTML and PDF template types
- Replaces placeholders with actual values
- Builds CSS styles from field properties
- Validates required fields before generation

## Server Actions

### For Platform Owner (`actions/invitation-templates-new.ts`)

#### 1. Upload PDF Template

```typescript
import { uploadPdfTemplate } from '@/actions/invitation-templates-new';

const result = await uploadPdfTemplate(base64Pdf);
// Returns: { previewUrl, pdfUrl, dimensions }
```

**Process:**
1. Validates user role (ROLE_PLATFORM_OWNER)
2. Validates PDF format and size (max 10MB)
3. Converts PDF to PNG preview (2x scale)
4. Uploads both PDF and PNG to Cloudflare R2
5. Generates long-lived signed URLs (1 year)
6. Returns URLs and dimensions

#### 2. Process PDF Template

```typescript
import { processPdfTemplate } from '@/actions/invitation-templates-new';

const result = await processPdfTemplate({
  pdfUrl,
  previewUrl,
  textRegions: [
    { top: 100, left: 200, width: 400, height: 50 }
  ],
  name: 'Elegant Wedding',
  nameHe: 'חתונה אלגנטית',
  eventType: 'WEDDING',
  fields: [
    {
      fieldType: 'COUPLE_NAMES_ENGLISH',
      label: 'Couple Names',
      labelHe: 'שמות בני הזוג',
      region: { top: 100, left: 200, width: 400, height: 50 },
      fontSize: '36px',
      fontFamily: 'Heebo',
      fontWeight: 'bold',
      textColor: '#000000',
      textAlign: 'center'
    }
  ]
});
```

**Process:**
1. Fetches preview PNG from R2 storage
2. Erases text regions using smart background matching
3. Uploads clean background to R2 storage
4. Generates long-lived signed URL
5. Creates InvitationTemplate record with fields
6. Revalidates admin page cache

#### 3. Get All Templates

```typescript
import { getInvitationTemplates } from '@/actions/invitation-templates-new';

const result = await getInvitationTemplates('WEDDING');
// Returns all active wedding templates with fields
```

### For Wedding Owners (`actions/generate-invitation.ts`)

#### 1. Generate Custom Invitation

```typescript
import { generateCustomInvitation } from '@/actions/generate-invitation';

const result = await generateCustomInvitation({
  eventId: 'event-123',
  templateId: 'template-456',
  fieldValues: [
    { fieldType: 'COUPLE_NAMES_ENGLISH', value: 'John & Jane' },
    { fieldType: 'EVENT_DATE', value: '15.06.2026' },
    { fieldType: 'VENUE_NAME', value: 'Grand Hall' }
  ]
});

// Returns: { success: true, pngUrl, generation }
```

**Process:**
1. Validates user role and event ownership
2. Fetches template with fields
3. Validates field values (required fields)
4. Generates PNG using invitation generator
5. Uploads PNG to Cloudflare R2
6. Generates long-lived signed URL (1 year)
7. Creates GeneratedInvitation record
8. Updates event with invitation URL
9. Revalidates event pages

#### 2. Preview Invitation

```typescript
import { previewInvitation } from '@/actions/generate-invitation';

const result = await previewInvitation({
  templateId: 'template-456',
  fieldValues: [...]
});

// Returns: { success: true, previewUrl: 'data:image/png;base64,...' }
```

**Process:**
- Same as generation but returns base64 data URL
- Does not save to database or R2 storage
- Useful for real-time preview in UI

#### 3. Get Event Invitations

```typescript
import { getEventInvitations } from '@/actions/generate-invitation';

const result = await getEventInvitations('event-123');
// Returns all generated invitations for the event
```

## Field Types (InvitationFieldType Enum)

```typescript
enum InvitationFieldType {
  // Guest Information
  GUEST_NAME,              // Individual guest name

  // Couple Names
  COUPLE_NAMES,            // Full couple names
  COUPLE_NAMES_ENGLISH,    // English version
  COUPLE_NAMES_HEBREW,     // Hebrew version

  // Date & Time
  EVENT_DATE,              // Full event date
  EVENT_DATE_HEBREW,       // Hebrew date format
  DAY_OF_WEEK,             // Monday, Tuesday, etc.
  RECEPTION_TIME,          // Reception start time
  CEREMONY_TIME,           // Ceremony start time

  // Location
  VENUE_NAME,              // Venue name
  VENUE_ADDRESS,           // Full address
  STREET_ADDRESS,          // Street only
  CITY,                    // City name

  // Families
  BRIDE_PARENTS,           // Bride's parents names
  GROOM_PARENTS,           // Groom's parents names
  BRIDE_FAMILY,            // Extended bride family
  GROOM_FAMILY,            // Extended groom family

  // Content
  EVENT_TYPE,              // Wedding, Henna, etc.
  INVITATION_TEXT,         // Custom invitation text
  BLESSING_QUOTE,          // Hebrew blessing or quote
  CUSTOM                   // Fallback for custom fields
}
```

## Workflow Example

### Platform Owner: Upload Wedding Template

1. **Upload PDF**
```typescript
const file = document.getElementById('pdfInput').files[0];
const reader = new FileReader();

reader.onload = async (e) => {
  const base64Pdf = e.target.result;

  const result = await uploadPdfTemplate(base64Pdf);

  if (result.error) {
    alert(result.error);
    return;
  }

  // Show preview and let admin mark text regions
  setPreviewUrl(result.previewUrl);
  setPdfUrl(result.pdfUrl);
  setDimensions(result.dimensions);
};

reader.readAsDataURL(file);
```

2. **Mark Text Regions** (UI needs to be built)
```typescript
// User clicks/drags on preview to mark regions
const regions = [
  { top: 100, left: 200, width: 400, height: 50 },   // Couple names
  { top: 300, left: 150, width: 500, height: 40 },   // Event date
  { top: 500, left: 200, width: 400, height: 35 },   // Venue
];
```

3. **Process Template**
```typescript
const result = await processPdfTemplate({
  pdfUrl,
  previewUrl,
  textRegions: regions,
  name: 'Elegant Wedding',
  nameHe: 'חתונה אלגנטית',
  eventType: 'WEDDING',
  fields: [
    {
      fieldType: 'COUPLE_NAMES_ENGLISH',
      label: 'Couple Names',
      labelHe: 'שמות בני הזוג',
      region: regions[0],
      fontSize: '36px',
      fontFamily: 'Heebo',
      fontWeight: 'bold',
      textColor: '#000000',
      textAlign: 'center'
    },
    {
      fieldType: 'EVENT_DATE',
      label: 'Event Date',
      labelHe: 'תאריך האירוע',
      region: regions[1],
      fontSize: '24px',
      fontFamily: 'Heebo',
      textAlign: 'center'
    },
    {
      fieldType: 'VENUE_NAME',
      label: 'Venue',
      labelHe: 'מקום',
      region: regions[2],
      fontSize: '20px',
      fontFamily: 'Heebo',
      textAlign: 'center'
    }
  ]
});

if (result.success) {
  alert('Template created successfully!');
}
```

### Wedding Owner: Generate Invitation

1. **Select Template**
```typescript
const { templates } = await getInvitationTemplates('WEDDING');
setSelectedTemplate(templates[0]);
```

2. **Fill Form**
```tsx
<form onSubmit={handleGenerate}>
  {selectedTemplate.fields.map(field => (
    <div key={field.id}>
      <label>{locale === 'he' ? field.labelHe : field.label}</label>
      <input
        name={field.fieldType}
        placeholder={field.placeholder}
        required={field.isRequired}
      />
    </div>
  ))}
  <button type="submit">Generate Invitation</button>
</form>
```

3. **Generate**
```typescript
const handleGenerate = async (e) => {
  e.preventDefault();

  const fieldValues = selectedTemplate.fields.map(field => ({
    fieldType: field.fieldType,
    value: e.target[field.fieldType].value
  }));

  const result = await generateCustomInvitation({
    eventId,
    templateId: selectedTemplate.id,
    fieldValues
  });

  if (result.success) {
    // Show generated invitation
    setInvitationUrl(result.pngUrl);
  }
};
```

## Testing Instructions

### Prerequisites

1. **Install Dependencies**
```bash
npm install puppeteer sharp pdf-lib canvas
```

2. **Apply Database Schema**
```bash
npx prisma generate
npx prisma db push
```

3. **Set Environment Variables**
```env
DATABASE_URL="your-neon-postgres-url"
CLOUDFLARE_R2_ACCOUNT_ID="your-r2-account-id"
CLOUDFLARE_R2_ACCESS_KEY_ID="your-r2-access-key"
CLOUDFLARE_R2_SECRET_ACCESS_KEY="your-r2-secret-key"
CLOUDFLARE_R2_BUCKET_NAME="your-bucket-name"
```

### Testing Steps

#### 1. Test PDF to PNG Conversion

Create a test file: `test-invitation.ts`

```typescript
import { pdfToPng, getPdfDimensions } from './lib/invitations';
import fs from 'fs';

async function testPdfConversion() {
  // Read your PDF template
  const pdfBuffer = fs.readFileSync('./path/to/wedding-template.pdf');

  // Get dimensions
  const dimensions = await getPdfDimensions(pdfBuffer);
  console.log('PDF Dimensions:', dimensions);

  // Convert to PNG
  const pngBuffer = await pdfToPng(pdfBuffer, { scale: 2 });

  // Save for inspection
  fs.writeFileSync('./test-preview.png', pngBuffer);
  console.log('Preview saved to test-preview.png');
}

testPdfConversion();
```

Run: `npx tsx test-invitation.ts`

#### 2. Test Smart Text Erasing

```typescript
import { smartEraseTextRegions, TextRegion } from './lib/invitations';
import fs from 'fs';

async function testTextErasing() {
  const pngBuffer = fs.readFileSync('./test-preview.png');

  // Define regions where text appears
  const regions: TextRegion[] = [
    { top: 100, left: 200, width: 400, height: 50 },
    { top: 300, left: 150, width: 500, height: 40 },
  ];

  const cleanBackground = await smartEraseTextRegions(pngBuffer, regions);

  fs.writeFileSync('./test-clean-background.png', cleanBackground);
  console.log('Clean background saved');
}

testTextErasing();
```

#### 3. Test Full Generation

```typescript
import { generateInvitation, FieldValue } from './lib/invitations';
import fs from 'fs';

async function testGeneration() {
  const template = {
    id: 'test',
    templateType: 'PDF',
    backgroundImageUrl: './test-clean-background.png',
    width: 800,
    height: 1200,
    fields: [
      {
        fieldType: 'COUPLE_NAMES_ENGLISH',
        fontSize: '36px',
        fontFamily: 'Heebo',
        fontWeight: 'bold',
        textColor: '#000000',
        textAlign: 'center',
        top: '100px',
        left: '200px',
        width: '400px'
      }
    ]
  };

  const fieldValues: FieldValue[] = [
    { fieldType: 'COUPLE_NAMES_ENGLISH', value: 'John & Jane' }
  ];

  const pngBuffer = await generateInvitation({ template, fieldValues });

  fs.writeFileSync('./test-final-invitation.png', pngBuffer);
  console.log('Final invitation saved');
}

testGeneration();
```

## What You Need to Do

### 1. Database Migration
Run the following command to apply the schema changes:
```bash
npx prisma db push
```

### 2. Build Template Editor UI
You need to create an admin page where you can:
- Upload PDF files
- View the PNG preview
- Click/drag to mark text regions visually
- Assign field types to each region
- Set font properties (size, family, weight, color)
- Save the processed template

Suggested location: `app/[locale]/(protected)/admin/invitation-templates/new/page.tsx`

### 3. Build Template Selection UI
Create a page for wedding owners to:
- Browse available templates filtered by event type
- Select a template
- Fill in the form with their details
- Preview the invitation in real-time
- Generate and download the final PNG

Suggested location: `app/[locale]/(protected)/dashboard/events/[eventId]/invitations/page.tsx`

### 4. Test with Your PDF Templates
You mentioned having wedding and henna PDF templates. Test the system by:
1. Upload one template using the uploadPdfTemplate action
2. Mark the text regions (you'll need to do this manually or build the UI)
3. Generate an invitation with test data
4. Verify the output looks correct

## Known Limitations

1. **Manual Region Marking**: Currently requires manual specification of text regions. A visual editor would improve UX.

2. **Font Matching**: System assumes you'll manually specify matching fonts. Auto-detection from PDF is complex.

3. **Right-to-Left Text**: Hebrew text should work, but may need CSS adjustments (`direction: rtl`).

4. **Performance**: First generation is slow (~2-3 seconds) due to Puppeteer startup. Subsequent generations are faster with singleton browser.

5. **PDF Output**: Currently only generates PNG. PDF output would require additional implementation.

## Future Enhancements

1. **Visual Region Editor**: Canvas-based UI for marking regions
2. **Font Auto-Detection**: Extract fonts from PDF automatically
3. **Multi-Page Templates**: Support for multi-page invitations
4. **Batch Generation**: Generate invitations for all guests
5. **PDF Output**: Option to download as PDF instead of PNG
6. **Template Marketplace**: Public template gallery
7. **Preview Mode**: Real-time preview while editing fields

## Technical Notes

### Why Puppeteer + Sharp?

- **Puppeteer**: Best for rendering HTML/CSS with exact layout control
- **Sharp**: High-performance image processing for erasing/compositing
- **pdf-lib**: Lightweight PDF parsing without heavy dependencies

### Performance Optimizations

1. **Browser Singleton**: Reuses same Puppeteer instance
2. **2x Scale Factor**: Balances quality vs file size
3. **PNG Compression**: Sharp's default compression is good
4. **R2 Storage**: Offloads file serving to Cloudflare R2 CDN with no egress fees

### Security Considerations

1. **Role Checks**: Only ROLE_PLATFORM_OWNER can upload templates
2. **Event Ownership**: Wedding owners can only generate for their events
3. **File Size Limits**: 10MB max for PDF uploads
4. **Input Validation**: All field values validated before generation

---

## Quick Reference

### Import Paths
```typescript
// Utilities
import { ... } from '@/lib/invitations';

// Actions (Platform Owner)
import { ... } from '@/actions/invitation-templates-new';

// Actions (Wedding Owner)
import { ... } from '@/actions/generate-invitation';
```

### Key Files
- `lib/invitations/pdf-to-png.ts` - PDF conversion
- `lib/invitations/image-processor.ts` - Text erasing
- `lib/invitations/html-to-png.ts` - HTML rendering
- `lib/invitations/generator.ts` - Main generation logic
- `actions/invitation-templates-new.ts` - Template management
- `actions/generate-invitation.ts` - User generation

### Database Models
- `InvitationTemplate` - Template definitions
- `InvitationTemplateField` - Template field configurations
- `GeneratedInvitation` - User-generated invitations

---

**Last Updated**: January 2026
**Status**: Core implementation complete, UI pending
