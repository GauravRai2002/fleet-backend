#!/usr/bin/env bash

# Quick helper to apply standard org scoping pattern to simple CRUD routes
# This supplements the manual fixes

ROUTE_FILE="$1"
MODEL_NAME="$2"

if [ -z "$ROUTE_FILE" ] || [ -z "$MODEL_NAME" ]; then
    echo "Usage: $0 <route-file> <model-name>"
    echo "Example: $0 src/routes/expenseCategories.ts expenseCategory"
    exit 1
fi

echo "Applying org scoping to $ROUTE FILE for model $MODEL_NAME..."

# Use perl for in-place editing with backup
perl -i.bak -pe '
    # GET all - add where clause
    s/(const \w+ = await prisma\.'$MODEL_NAME'\.findMany\(\{\s*)orderBy/$1where: { organizationId: req.auth!.orgId! },\n        orderBy/;
    
    # Change _req to req in GET all
    s/async \(_req: Request/async (req: Request/;
    
    # GET by ID - change findUnique to findFirst
    s/\.findUnique\(\{\s*where: \{ id: req\.params\.id \}/\.findFirst({\n        where: { \n            id: req.params.id,\n            organizationId: req.auth!.orgId!\n        }/;
    
' "$ROUTE_FILE"

echo "✅ Pattern applied. Review changes with: git diff $ROUTE_FILE"
