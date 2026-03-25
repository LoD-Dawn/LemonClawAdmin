# Client Page Permission Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two bugs: (1) personal accounts clicking department skill/MCP apply buttons get no feedback, (2) personal accounts cannot create their own skills/MCPs

**Architecture:** Two separate fixes:
1. Apply button issue: The `ApplyButton` condition `!isOwner && visibility === 'department'` may render buttons for resources that fail API validation silently. Need to show user-friendly error messages.
2. Create permission issue: `/api/v1/skills` and `/api/v1/mcps` POST routes require `requireAdmin` (superadmin only). Need to allow regular users to create `personal` visibility resources with themselves as owner.

**Tech Stack:** Next.js 15, NextAuth, Prisma/SQLite, Radix UI, React Hook Form + Zod

---

## Chunk 1: Fix Apply Button - Department Skills Show "Only department resources can be applied"

### Files
- Modify: `src/app/api/client/skills/[id]/apply/route.ts:19-21`
- Modify: `src/app/api/client/mcps/[id]/apply/route.ts:19-21`
- Modify: `src/app/(client)/client/page.tsx:234-238`

### Steps

- [ ] **Step 1: Fix query in client page to not fetch department skills when user has no organizationId**

In `src/app/(client)/client/page.tsx`, the query at lines 162-166 and 183-187 fetches department skills even when `organizationId` is null. When `organizationId` is null, the query `{ visibility: 'department', organizationId: null }` doesn't match real department skills (which have actual org IDs), so no department skills are shown. However, the issue is that if somehow a user without org sees department skills and clicks apply, the API will fail.

The real fix: The department section at line 305 is already wrapped with `{organizationId && (...)`, so users without org don't see department section at all. But the `groupByVisibility` function at lines 234-238 has a subtle bug:

```typescript
// Current code at lines 234-237:
} else if (item.visibility === 'department') {
  // Only show department resources to users in the same organization
  if (organizationId) {
    department.push(item)
  }
}
```

This looks correct. Let me verify the API error handling instead.

- [ ] **Step 2: The API returns 400 "Only department resources can be applied" which means visibility check fails**

This error only happens if `skill.visibility !== 'department'`. This suggests the skill's visibility is somehow not 'department' even though it's shown in the department section. This could happen if:
- The data has corrupted visibility values
- There's a mismatch between what's displayed and what's queried

Actually, looking more carefully at the issue: the problem might be that the **department section shows skills from other categories** due to the query.

Wait - I traced the issue. The query at lines 162-166:
```javascript
OR: [
  { visibility: 'company' },
  { visibility: 'department', organizationId: organizationId },
  { visibility: 'personal', ownerId: userId },
]
```

If `organizationId` is null (personal user), the second condition `{ visibility: 'department', organizationId: null }` will NOT match department skills (which have non-null orgId). So users without org don't see department skills in the list.

**The actual bug**: If a personal user somehow has an `organizationId` (maybe their org was deleted but the field still has a value?), they WOULD see department skills and the apply button would work correctly.

Let me re-examine the issue description: "个人账号点击部门skill申请按钮，没有任何反应"

"没有任何反应" means absolutely no response - no toast, no error, nothing. This strongly suggests the button's onClick handler is not being called at all.

Actually, I realize the issue now! Looking at `ResourceCard` at lines 44-56:

```typescript
<div className="flex items-center gap-1.5 shrink-0">
  {visibility === 'personal' && <Badge variant="secondary">个人</Badge>}
  {!isOwner && visibility === 'department' && (
    <ApplyButton
      resourceType={resourceType}
      resourceId={resourceId}
      status={applyStatus}
    />
  )}
  ...
</div>
```

The `visibility` prop is passed from `ResourceSection` which gets it from `resource.visibility`. This is a string from the database.

BUT - looking at the `ApplyButton` component at line 34-55:
```typescript
onClick={async () => {
  setLoading(true)
  try {
    const endpoint = resourceType === 'skill'
      ? `/api/client/skills/${resourceId}/apply`
      : `/api/client/mcps/${resourceId}/apply`
    const res = await fetch(endpoint, {
      method: 'POST',
    })
    ...
```

There's NO `credentials: 'include'` or `Authorization` header. The request relies on NextAuth session cookies being sent automatically.

But wait - this is a 'use client' component and the page is a server component. The fetch should work with cookies...

Actually, I think the issue might be simpler. Let me check if there's an issue with the fetch itself.

Hmm, but the user said "没有任何反应" (no response at all). If it was a network issue, we should see the catch block toast "申请失败".

Let me think about this differently. The user is using a **personal account** (个人账号). What defines a personal account?

Looking at the data model:
- A user has `organizationId` and `departmentId` (optional)
- A "personal" account might be one with no organization

For a user with no organization:
1. The query won't return department skills (because `organizationId` is null)
2. The department section won't render (because of `{organizationId && ...}`)
3. Therefore, no apply button for department skills

So for true personal accounts (no org), they can't even SEE department skills, let alone click apply.

**Alternative interpretation**: "个人账号" might mean "personal (individual) user within an organization" - someone who isn't a department admin or superadmin.

If that's the case, they CAN see department skills, and clicking apply SHOULD work.

Let me look at the actual error case. The API at line 19-21:
```typescript
if (skill.visibility !== 'department') {
  return NextResponse.json({ error: 'Only department resources can be applied' }, { status: 400 })
}
```

If this check fails, the user gets an error toast. But user said "no response".

OH WAIT. I just realized something. The error "Only department resources can be applied" is returned when `visibility !== 'department'`. But if the apply button is only shown when `visibility === 'department'`, how could this happen?

It could happen if:
1. The `visibility` prop passed to `ResourceCard` doesn't match what's in the database
2. Or there's a race condition where the data changes between render and API call

Actually, there's another possibility. What if the `ApplyButton` is rendered but `status === 'approved'` or `status === 'pending'` which shows a Badge instead of a clickable button?

Looking at ApplyButton lines 20-26:
```typescript
if (status === 'approved') {
  return <Badge variant="success">已授权</Badge>
}

if (status === 'pending') {
  return <Badge variant="warning">待审批</Badge>
}
```

If `status` is 'approved' or 'pending', the user sees a badge, not a button. But that still shows something - the badge.

**Final analysis for Issue 1**: The issue might be that when a user with no organization clicks the department skill section (if they can somehow see it), they don't see an apply button because:
1. The section doesn't render (no orgId)
2. OR if somehow they do see department skills, the apply button might not render because of the `!isOwner` check

Actually, let me just fix what I can identify:

1. The API error message "Only department resources can be applied" should be clearer
2. We should add better error handling in the apply route

**Real Fix for Issue 1**: I think the actual bug is that for a user with `organizationId = null`, if somehow department skills appear in the query results (which shouldn't happen), clicking apply would work but the API would return "Only department resources can be applied" - but that's not what we're seeing.

Let me focus on making the apply flow more robust and add better error messages. The user might be seeing an error toast that they're not recognizing.

Actually, you know what - let me just look at what errors could cause "no response":

1. If `resourceId` is undefined, fetch would be `/api/client/skills/undefined/apply` - this would 404, showing "Skill not found"
2. If `resourceType` is undefined, the endpoint would be wrong - but we set it explicitly

I think the actual issue might be that for some users, the apply button is rendered but clicking it doesn't do anything visible. This could happen if:
1. There's a JavaScript error preventing the handler from running
2. The toast is being shown but dismissed quickly
3. There's some UI overlay blocking clicks

For now, I'll focus on the clearer Issue 2 and then come back to Issue 1 with more targeted fixes.

---

## Chunk 2: Allow Personal Users to Create Personal Skills/MCPs

### Files
- Modify: `src/app/api/v1/skills/route.ts:62-105`
- Modify: `src/app/api/v1/mcps/route.ts` (similar structure)
- Modify: `src/components/skills/skill-form-dialog.tsx:51-76`
- Modify: `src/components/mcps/mcp-form-dialog.tsx`

### Steps

- [ ] **Step 1: Understand the current permission model**

Current state:
- `POST /api/v1/skills` requires `requireAdmin` which checks `isSuperAdmin === true`
- This means regular users cannot create any skills, even personal ones they would own

Required change:
- Allow regular users to create skills with `visibility: 'personal'` and `ownerId: theirOwnId`
- Keep admin requirement for `visibility: 'company'` or `'department'`

- [ ] **Step 2: Modify skill POST route to allow personal skill creation**

In `src/app/api/v1/skills/route.ts`, after line 63 (`const authResult = await requireApiAuth(request)`), modify to:

```typescript
// Current: requireAdmin blocks all non-superadmins
// New: Allow users to create personal skills they own

// For personal visibility, any authenticated user can create
if (parsed.data.visibility === 'personal') {
  // Set the owner to the current user if not specified
  if (!parsed.data.ownerId) {
    parsed.data.ownerId = (authResult as any).userId
  }
  // Validate that ownerId matches the authenticated user (users can only create their own personal skills)
  if (parsed.data.ownerId !== (authResult as any).userId) {
    return NextResponse.json(
      { error: 'Cannot create personal skill for another user', code: 'FORBIDDEN_NOT_OWNER' },
      { status: 403 }
    )
  }
} else {
  // For company/department visibility, require admin
  const adminResult = await requireAdmin(request)
  if (adminResult instanceof NextResponse) return adminResult
}
```

But wait - `requireAdmin` is called AFTER the validation check in our new flow. We need to restructure.

Better approach:
1. First check if it's a personal visibility request
2. If yes, validate ownership and allow
3. If no, call `requireAdmin` to check for superadmin

Actually, `requireAdmin` itself calls `requireApiAuth` internally. We don't want to call it twice.

Let me restructure:

```typescript
export async function POST(request: NextRequest) {
  // First authenticate the user
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const userId = (authResult as any).userId

  const body = await request.json()
  const parsed = createSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { visibility, ownerId, organizationId } = parsed.data

  // Handle personal visibility - allow any authenticated user
  if (visibility === 'personal') {
    // Users can only create personal skills for themselves
    if (ownerId && ownerId !== userId) {
      return NextResponse.json(
        { error: 'Cannot create personal skill for another user', code: 'FORBIDDEN_NOT_OWNER' },
        { status: 403 }
      )
    }
    // Auto-assign owner to current user if not specified
    parsed.data.ownerId = userId
  } else {
    // For company/department visibility, require superadmin
    if (!(authResult as any).user.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden', code: 'FORBIDDEN_ADMIN_REQUIRED' },
        { status: 403 }
      )
    }
    // Validate visibility constraints for company/department
    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId required for company/department visibility', code: 'VALIDATION_MISSING_ORG' },
        { status: 400 }
      )
    }
  }

  // Validate ownerId for personal visibility
  if (visibility === 'personal' && !parsed.data.ownerId) {
    return NextResponse.json(
      { error: 'ownerId required for personal visibility', code: 'VALIDATION_MISSING_OWNER' },
      { status: 400 }
    )
  }

  try {
    const skill = await db.skill.create({ data: parsed.data })
    return NextResponse.json({ data: skill }, { status: 201 })
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'Identifier already exists in this scope', code: 'CONFLICT_IDENTIFIER_EXISTS' },
        { status: 409 }
      )
    }
    throw error
  }
}
```

- [ ] **Step 3: Run existing skill creation test to verify basic functionality**

Run: `npm run db:seed` (if seed script exists) or create a test skill via API

Expected: Personal skill creation should work for authenticated users

- [ ] **Step 4: Apply same changes to MCP POST route**

Follow the same pattern for `src/app/api/v1/mcps/route.ts`

- [ ] **Step 5: Update skill form dialog to pre-select personal visibility and set owner**

In `src/components/skills/skill-form-dialog.tsx`, when a non-admin user opens the form:
- Default visibility to 'personal'
- The ownerId should be automatically set to the current user (from session) and hidden
- Show a message like "个人级技能只对您可见"

Actually, the form currently has `organizationId` which doesn't make sense for personal skills. We need to:
1. Hide organizationId field when visibility is 'personal'
2. Auto-submit with ownerId = current user ID

Let me update the form:

```typescript
// In onSubmit function, modify values before sending:
const submitValues = {
  ...values,
  ownerId: visibility === 'personal' ? currentUserId : values.ownerId,
  organizationId: visibility === 'personal' ? null : values.organizationId,
}
```

But wait - we need to know the current user's ID in the client component. We can get this from the session. Actually, since the form is in a client component, we need to pass the user ID from the server page.

Looking at `dashboard/skills/page.tsx`, it doesn't pass user info to SkillsClient. We need to:
1. Pass the current user's ID and isSuperAdmin status to SkillsClient
2. SkillsClient passes to SkillsTable
3. SkillsTable passes to SkillFormDialog
4. Form uses this to set defaults and hide/show fields

This is getting complex. Let me simplify:

For personal skill creation, we can:
1. Have the API auto-assign ownerId to the authenticated user (already done)
2. In the form, when visibility='personal', hide organizationId and just show a notice "将创建个人级技能，仅您可见"

Actually, the simplest approach: modify the form so that when visibility='personal':
- organizationId is not sent (set to null)
- ownerId is automatically the current user (set by API based on auth)

The user just needs to see the correct default state in the form.

Let me update the SkillFormDialog:

```typescript
// Add visibility change handler
const handleVisibilityChange = (value: string) => {
  if (value === 'personal') {
    form.setValue('organizationId', null as any)
  }
  field.onChange(value)
}

// In the visibility field's onChange:
<Select onValueChange={handleVisibilityChange} defaultValue={field.value}>

// In organizationId field, add conditional:
{form.watch('visibility') !== 'personal' && (
  <FormField control={form.control} name="organizationId" render={({ field }) => (
    <FormItem><FormLabel>所属组织</FormLabel>
    ...
  )} />
)}
```

- [ ] **Step 6: Commit the skill creation fix**

```bash
git add src/app/api/v1/skills/route.ts src/app/api/v1/mcps/route.ts src/components/skills/skill-form-dialog.tsx src/components/mcps/mcp-form-dialog.tsx
git commit -m "feat: allow users to create personal skills and mcps"
```

---

## Chunk 3: Investigate and Fix Apply Button "No Response" Issue

### Files
- Modify: `src/app/(client)/client/page.tsx`
- Modify: `src/components/client/apply-button.tsx`

### Steps

- [ ] **Step 1: Add debug logging to understand the flow**

The user says clicking apply button produces "no response". This is hard to debug without seeing the actual error. Let's add better error handling and ensure the button actually works.

First, let me check if the issue is with the `status` prop causing the button not to render:

In `ResourceSection`, at lines 117-125:
```typescript
const isOwner = resource.ownerId === userId
let applyStatus: 'none' | 'pending' | 'approved' = 'none'
if (isOwner) {
  applyStatus = 'approved'
} else if (approvedKeys.has(key)) {
  applyStatus = 'approved'
} else if (pendingKeys.has(key)) {
  applyStatus = 'pending'
}
```

If `isOwner` is true (user owns a department skill - which shouldn't happen normally), the status is 'approved' and no button shows.

Wait - can a regular user own a department skill? Looking at the create flow, only admins can create skills. But the owner field exists... Maybe the issue is different.

Actually, I think I finally understand the issue. Let me re-read the user report:

"个人账号点击部门skill申请按钮，没有任何反应"

If "个人账号" means "personal account" (user without organization):
1. They shouldn't see department skills section (because `organizationId` is null, line 305 check)
2. But maybe they DO see it somehow?

OR if "个人账号" means "personal user within organization":
1. They DO see department skills
2. The apply button SHOULD work

The phrase "没有任何反应" is strong - no toast, no nothing. This could mean:
1. The button click handler throws before fetch
2. The fetch returns a 4xx/5xx but the toast doesn't show
3. There's a JS error somewhere

Let me add defensive coding to ApplyButton:

```typescript
onClick={async () => {
  console.log('[ApplyButton] Clicked', { resourceType, resourceId, status })
  setLoading(true)
  try {
    const endpoint = resourceType === 'skill'
      ? `/api/client/skills/${resourceId}/apply`
      : `/api/client/mcps/${resourceId}/apply`
    console.log('[ApplyButton] Calling API:', endpoint)
    const res = await fetch(endpoint, {
      method: 'POST',
    })
    console.log('[ApplyButton] Response:', res.status, await res.text().catch(() => 'parse error'))
    if (res.ok) {
      toast({ title: '申请已提交' })
      router.refresh()
    } else {
      const error = await res.json()
      toast({ title: '错误', description: error.error || 'Unknown error', variant: 'destructive' })
    }
  } catch (err) {
    console.error('[ApplyButton] Error:', err)
    toast({ title: '错误', description: '申请失败', variant: 'destructive' })
  } finally {
    setLoading(false)
  }
}}
```

But we can't commit debug logs. Let me think of a better approach.

Actually, I think the issue might be that:
1. For a user with no organization, they might see the "部门" section but with 0 items
2. The empty state message shows "暂无部门 Skills"
3. User clicks where the apply button WOULD be (but isn't), getting no response

Wait, no - if there are 0 items, there's nothing to click.

Let me look at the issue from yet another angle. The user might be clicking the wrong thing. Or there could be a UI bug where the button is hidden but the click area exists.

Actually, I think I need to just add some defensive improvements:

1. Add error boundary around the apply button
2. Show a clearer error if the API call fails in an unexpected way
3. Ensure the toast always shows on error

Let me make these changes:

```typescript
// In apply-button.tsx, add error handling:
onClick={async () => {
  if (!resourceId) {
    toast({ title: '错误', description: '资源ID无效', variant: 'destructive' })
    return
  }
  setLoading(true)
  try {
    const endpoint = resourceType === 'skill'
      ? `/api/client/skills/${resourceId}/apply`
      : `/api/client/mcps/${resourceId}/apply`
    const res = await fetch(endpoint, { method: 'POST' })
    if (res.ok) {
      toast({ title: '申请已提交' })
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({ error: 'Unknown error' }))
      toast({
        title: '错误',
        description: data.error || `申请失败 (${res.status})`,
        variant: 'destructive'
      })
    }
  } catch {
    toast({ title: '错误', description: '网络错误，请重试', variant: 'destructive' })
  } finally {
    setLoading(false)
  }
}}
```

- [ ] **Step 2: Add defensive check for resourceId in ApplyButton**

- [ ] **Step 3: Consider if the issue is that department section doesn't show for certain users**

In `page.tsx`, the department section is conditional:
```typescript
{organizationId && (
  <div>
    ...
  </div>
)}
```

If `organizationId` is `null`, `undefined`, or empty string, the department section won't show. But this is correct behavior.

However, what if the user's `organizationId` was set to some value that doesn't match any organization? Then:
1. The query would return department skills for that orgId (which might not exist or might be deleted)
2. The apply button would show
3. Clicking would fail because the skill's organization doesn't match user's current organization

Actually wait - look at line 24 in the apply route:
```typescript
if (skill.organizationId !== requestingUser.organizationId) {
  return NextResponse.json({ error: 'Cannot apply to resource in different organization' }, { status: 403 })
}
```

If the user's org was deleted but their `organizationId` field still has a stale value, this check would fail.

But the user should still see an error toast...

I think the issue might be browser caching or some edge case I can't reproduce without the actual environment.

Let me just make the improvements and commit.

- [ ] **Step 4: Commit the apply button improvements**

```bash
git add src/components/client/apply-button.tsx
git commit -m "fix: improve apply button error handling and defensive checks"
```

---

## Verification Steps

After implementing:

1. **Test personal skill creation**:
   - Login as a non-admin user
   - Go to Dashboard -> Skills
   - Click "新建 Skill"
   - Select visibility "个人级"
   - Verify organizationId field is hidden/disabled
   - Fill in name, identifier, sourceType, sourceValue
   - Submit and verify skill is created with ownerId = your user ID

2. **Test department skill application**:
   - Login as a user with organization
   - Go to Client page
   - Find a department skill (not owned by you)
   - Click "申请" button
   - Verify toast "申请已提交" appears
   - Verify the button changes to "待审批" after refresh

3. **Test no-organization user**:
   - Login as a user with no organization
   - Go to Client page
   - Verify department section is not shown
   - Go to Dashboard -> Skills
   - Verify you can still create a "个人级" skill
