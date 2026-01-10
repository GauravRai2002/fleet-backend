#!/bin/bash

# Script to verify organization-scoping in all route files
# This helps identify which routes still need updates

echo "Checking organization scoping in route files..."
echo "=============================================="

for file in src/routes/*.ts; do
  filename=$(basename "$file")
  
  # Skip auth.ts as it's handled differently
  if [ "$filename" = "auth.ts" ]; then
    continue
  fi
  
  echo -e "\n📁 $filename"
  
  # Check for where clauses with organizationId
  org_filters=$(grep -c "organizationId: req.auth" "$file" 2>/dev/null || echo "0")
  
  # Check for findMany/findFirst/findUnique calls
  find_calls=$(grep -c "find\(Many\|First\|Unique\)" "$file" 2>/dev/null || echo "0")
  
  echo "  - Organization filters found: $org_filters"
  echo "  - Find operations found: $find_calls"
  
  if [ "$org_filters" -lt "$find_calls" ]; then
    echo "  ⚠️  NEEDS UPDATE: Some queries may be missing org filtering"
  else
    echo "  ✅ Appears to have org filtering"
  fi
done

echo -e "\n=============================================="
echo "Review complete. Update files marked with ⚠️"
