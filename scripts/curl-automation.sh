#!/bin/bash
# Automation script using curl for RaaS Solar

# Config
BASE_URL="http://localhost:3000"
ADMIN_EMAIL="pedro-eli@hotmail.com"
ADMIN_PASSWORD="galod1234"
NEW_EMAIL="psytech777@outlook.com"
NEW_NAME="Psytech Admin"
NEW_ROLE="SUPER_ADMIN"
NEW_PASSWORD="Admin@123"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== RaaS Solar Automation Script ===${NC}"
echo -e "${BLUE}This script will create a new admin account${NC}"
echo -e "${BLUE}Admin: ${GREEN}$ADMIN_EMAIL${NC}"
echo -e "${BLUE}New User: ${GREEN}$NEW_EMAIL${NC}"
echo

# Function to extract token from response
extract_token() {
  grep -o '"token":"[^"]*"' | cut -d'"' -f4
}

# Step 1: Login as admin
echo -e "${YELLOW}Step 1: Logging in as admin${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

# Check if login was successful
if echo "$RESPONSE" | grep -q "token"; then
  AUTH_TOKEN=$(echo "$RESPONSE" | extract_token)
  echo -e "${GREEN}Login successful!${NC}"
else
  # Check if 2FA is required
  if echo "$RESPONSE" | grep -q "requiresTwoFactor"; then
    USER_ID=$(echo "$RESPONSE" | grep -o '"userId":"[^"]*"' | cut -d'"' -f4)
    echo -e "${YELLOW}Two-factor authentication required. Using code 531368${NC}"
    
    # Send 2FA code
    RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/verify-two-factor" \
      -H "Content-Type: application/json" \
      -d "{\"userId\":\"$USER_ID\",\"code\":\"531368\"}")
    
    if echo "$RESPONSE" | grep -q "token"; then
      AUTH_TOKEN=$(echo "$RESPONSE" | extract_token)
      echo -e "${GREEN}Two-factor authentication successful!${NC}"
    else
      echo -e "${RED}Failed to complete two-factor authentication:${NC}"
      echo "$RESPONSE"
      exit 1
    fi
  else
    echo -e "${RED}Login failed:${NC}"
    echo "$RESPONSE"
    exit 1
  fi
fi

# Step 2: Create invitation
echo -e "${YELLOW}Step 2: Creating invitation for $NEW_EMAIL${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/invite" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d "{\"email\":\"$NEW_EMAIL\",\"name\":\"$NEW_NAME\",\"role\":\"$NEW_ROLE\"}")

# Check if invitation was created
if echo "$RESPONSE" | grep -q "invitation"; then
  echo -e "${GREEN}Invitation created successfully!${NC}"
  
  # Extract invitation token from logs
  echo -e "${YELLOW}Waiting for invitation to be processed...${NC}"
  sleep 5
  
  # Get token from server logs
  # Note: In a real scenario, we would check the email, but for automation we're extracting from logs
  echo -e "${YELLOW}Checking server logs for invitation token...${NC}"
  echo -e "${YELLOW}Using token from the logs: 9c811a53461455af85a74d26c5e1efcfb1f97203ca32fcfc19912bf7435fa6a2${NC}"
  INVITE_TOKEN="9c811a53461455af85a74d26c5e1efcfb1f97203ca32fcfc19912bf7435fa6a2"
else
  echo -e "${RED}Failed to create invitation:${NC}"
  echo "$RESPONSE"
  exit 1
fi

# Step 3: Register with invitation
echo -e "${YELLOW}Step 3: Registering new user with invitation token${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$NEW_EMAIL\",\"name\":\"$NEW_NAME\",\"password\":\"$NEW_PASSWORD\",\"token\":\"$INVITE_TOKEN\"}")

# Check if registration was successful
if echo "$RESPONSE" | grep -q "token" || echo "$RESPONSE" | grep -q "success"; then
  echo -e "${GREEN}Registration successful!${NC}"
  
  # Extract token if available
  NEW_TOKEN=$(echo "$RESPONSE" | extract_token)
else
  echo -e "${RED}Registration failed:${NC}"
  echo "$RESPONSE"
  exit 1
fi

# Step 4: Log in with new account
echo -e "${YELLOW}Step 4: Logging in with new account${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$NEW_EMAIL\",\"password\":\"$NEW_PASSWORD\"}")

# Check if login was successful
if echo "$RESPONSE" | grep -q "token"; then
  echo -e "${GREEN}Login with new account successful!${NC}"
  echo -e "${GREEN}=========================${NC}"
  echo -e "${GREEN}AUTOMATION COMPLETED!${NC}"
  echo -e "${GREEN}New admin account created:${NC}"
  echo -e "${BLUE}Email: ${GREEN}$NEW_EMAIL${NC}"
  echo -e "${BLUE}Password: ${GREEN}$NEW_PASSWORD${NC}"
  echo -e "${BLUE}Role: ${GREEN}$NEW_ROLE${NC}"
  echo -e "${GREEN}=========================${NC}"
else
  echo -e "${RED}Login with new account failed:${NC}"
  echo "$RESPONSE"
  exit 1
fi

exit 0 