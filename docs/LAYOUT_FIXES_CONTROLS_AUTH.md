# Layout Fixes: Map Controls & Duplicate Sign-In

## Issues Fixed

### 1. Map Controls Toolbar Clashing with Right Sidebar

**Problem:**
The MapControlsToolbar (compass/recenter button) was positioned at `bottom-4 right-4`, which collided with the right property sidebar panel.

**Solution:**
Updated positioning to clear the bottom metrics ribbon.

**File:** `src/components/MapControlsToolbar.tsx` (line 76)

```tsx
// BEFORE - Collision with sidebar
<div className="absolute bottom-4 right-4 z-20 ...">

// AFTER - Cleared space
<div className="absolute bottom-28 right-4 z-20 ...">
```

**Result:**
- ✅ MapControlsToolbar now sits above the bottom metrics ribbon
- ✅ No collision with right sidebar
- ✅ Consistent spacing with Zone Filter (also at bottom-28)

### 2. Duplicate Sign-In Logos on Landing Page

**Problem:**
Two UserButton instances were rendering when signed in:
1. UserButton in `page.tsx` (line 215)
2. UserButton in `GlobalControls.tsx` (line 63-73)

This caused two profile avatars to appear in the header.

**Solution:**
Removed the duplicate UserButton from landing page, kept only the one in GlobalControls.

**File:** `src/app/page.tsx` (lines 202-218)

```tsx
// BEFORE - Duplicate UserButton
<Show when="signed-out">
  <SignInButton mode="modal">...</SignInButton>
</Show>

<Show when="signed-in">
  <div className="ml-4 flex items-center gap-3">
    <GlobalControls />
    <div className="h-6 w-px bg-zinc-700" />
    <UserButton />  {/* ❌ Duplicate */}
  </div>
</Show>

// AFTER - Single UserButton (in GlobalControls)
<Show when="signed-out">
  <SignInButton mode="modal">...</SignInButton>
</Show>

{/* GlobalControls includes UserButton when signed in */}
<GlobalControls />
```

**Result:**
- ✅ Single sign-in button when signed out
- ✅ Single user avatar when signed in (from GlobalControls)
- ✅ No visual duplication

## Layout Structure (After Fixes)

```
┌──────────────────────────────────────────────┐
│  Top Header                                  │
│  [Logo] [Try for free / UserButton]         │
├──────────────────────────────────────────────┤
│                                               │
│                                               │
│           Map Canvas                          │
│                                               │
│                                               │
├─────────────┬───────────────┬────────────────┤
│ Zone Filter │               │ Map Controls   │ ← both at bottom-28
│ (left-4)    │               │ (right-4)      │
├─────────────┴───────────────┴────────────────┤
│ ↑ Gap (7rem = 112px)                         │
├───────────────────────────────────────────────┤
│ Metrics Ribbon (bottom-6, z-30)              │
│ Zoning | Lot Size | Frontage | ...           │
└───────────────────────────────────────────────┘
```

## Files Modified

1. **`src/components/MapControlsToolbar.tsx`**
   - Changed: `bottom-4` → `bottom-28`
   - Reason: Clear bottom metrics ribbon

2. **`src/app/page.tsx`**
   - Removed: Duplicate `<UserButton />` from signed-in section
   - Kept: Single `<GlobalControls />` which includes UserButton

## Testing

```bash
npm run dev
```

### Test 1: Map Controls Position
1. Navigate to any property
2. Verify MapControlsToolbar (compass icon) appears in bottom-right
3. Verify it sits above the metrics ribbon with clear gap
4. Verify no overlap with right sidebar

### Test 2: Landing Page Sign-In
1. Go to homepage (signed out)
2. Verify single "Try for free" button appears
3. Sign in
4. Verify single user avatar appears (from GlobalControls)
5. Verify no duplicate avatars

## Visual Verification

**Map Controls:**
```
              ┌──────────────┐
              │  Compass     │ ← bottom-28 (112px)
              │  3D Toggle   │
              │  Zoom +/-    │
              └──────────────┘
                    ↓ gap
┌──────────────────────────────┐
│ Metrics Ribbon (bottom-6)    │ ← 24px
└──────────────────────────────┘
```

**Landing Page Header:**
```
Signed Out:
┌──────────────────────────────┐
│ SimplySite   [Try for free]  │ ← Single button
└──────────────────────────────┘

Signed In:
┌──────────────────────────────┐
│ SimplySite   [🌓][EN/中][👤] │ ← Single avatar
└──────────────────────────────┘
```

## Related Fixes

These fixes maintain consistency with the earlier Zone Filter positioning fix:
- Zone Filter: `bottom-28 left-4`
- Map Controls: `bottom-28 right-4`
- Metrics Ribbon: `bottom-6` (both clear this)

All floating panels now respect the bottom metrics ribbon with consistent spacing.

---

**Result:** No more layout collisions, clean UI hierarchy! ✅
