# Filter Feature Count Test Plan

## Test Cases

### Test 1: Valid Filter (Should Have Results)
**Request:** "show protected areas managed by federal agencies"
**Expected Filter:** `["==", "AGNCY_LEV", "Federal"]`
**Expected Result:**
```json
{
  "success": true,
  "featuresInView": > 0,
  "description": "...",
  "warning": null
}
```

### Test 2: Over-Restrictive Filter (No Results)
**Request:** "show national parks" (if CPAD doesn't use this exact terminology)
**Likely Filter:** `["==", "UNIT_NAME", "National Park"]`
**Expected Result:**
```json
{
  "success": true,
  "featuresInView": 0,
  "warning": "No features match this filter in the current map view..."
}
```
**Expected LLM Behavior:** Should recognize the warning and maybe query to check available UNIT_NAME values

### Test 3: Clear Filter (Restore All Features)
**Request:** "clear filter on protected areas"
**Expected Result:**
```json
{
  "success": true,
  "featuresInView": > 100,
  "warning": null
}
```

## Verification Steps

1. Deploy updated code
2. Test each scenario manually in browser
3. Check console logs for feature count
4. Observe LLM response to warnings
5. Verify LLM can self-correct by querying data when filter returns 0

## Expected Console Output

```
[MapController] Filter applied to layer 'cpad-fill': ["==", "AGNCY_LEV", "Federal"]
[MapController] Filter result: 42 features visible in current view
```

## Success Criteria

- ✅ Filter tool returns `featuresInView` count
- ✅ Warning appears when count is 0
- ✅ LLM can read and react to feature count
- ✅ LLM suggests checking data when over-filtering occurs
