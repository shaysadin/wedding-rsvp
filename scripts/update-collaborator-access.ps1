# PowerShell script to update collaborator access across all action files
# This replaces owner-only checks with canAccessEvent helper

$actionsDir = Join-Path $PSScriptRoot "..\actions"
$files = @(
    "seating.ts",
    "tasks.ts",
    "suppliers.ts",
    "notifications.ts",
    "rsvp-settings.ts",
    "invitations.ts",
    "bulk-notifications.ts",
    "generate-invitation.ts",
    "automation.ts"
)

Write-Host "`n🔧 Updating Collaborator Access Patterns`n" -ForegroundColor Cyan
Write-Host "=" * 60

foreach ($file in $files) {
    $filePath = Join-Path $actionsDir $file

    if (-not (Test-Path $filePath)) {
        Write-Host "⏭️  $file - Not found, skipping" -ForegroundColor Yellow
        continue
    }

    $content = Get-Content $filePath -Raw
    $original = $content
    $changeCount = 0

    # Pattern 1: Replace simple event ownership check followed by error return
    # From:
    #   const event = await prisma.weddingEvent.findFirst({
    #     where: { id: eventId, ownerId: user.id },
    #   });
    #   if (!event) {
    #     return { error: "Event not found" };
    #   }
    #
    # To:
    #   const hasAccess = await canAccessEvent(eventId, user.id, "EDITOR");
    #   if (!hasAccess) {
    #     return { error: "Event not found" };
    #   }

    # This is complex, so we'll output a report instead
    $ownershipMatches = [regex]::Matches($content, 'where:\s*\{\s*id:\s*([^,]+),\s*ownerId:\s*user\.id\s*\}')

    if ($ownershipMatches.Count -gt 0) {
        Write-Host "⚠️  $file - $($ownershipMatches.Count) ownership checks found (manual update needed)" -ForegroundColor Yellow
        $changeCount = $ownershipMatches.Count
    } else {
        Write-Host "✓  $file - No ownership checks found" -ForegroundColor Green
    }
}

Write-Host "`n=" * 60
Write-Host "`n📝 Manual Update Required" -ForegroundColor Yellow
Write-Host "`nFor WRITE operations (create/update/delete), replace:"
Write-Host "   const event = await prisma.weddingEvent.findFirst({"
Write-Host "     where: { id: eventId, ownerId: user.id },"
Write-Host "   });"
Write-Host "   if (!event) { return { error: 'Event not found' }; }"
Write-Host "`nWith:"
Write-Host "   const hasAccess = await canAccessEvent(eventId, user.id, 'EDITOR');"
Write-Host "   if (!hasAccess) { return { error: 'Event not found' }; }"
Write-Host "`nFor READ operations (get/view), replace with:"
Write-Host "   const hasAccess = await canAccessEvent(eventId, user.id);"
Write-Host "   if (!hasAccess) { return { error: 'Event not found' }; }`n"
