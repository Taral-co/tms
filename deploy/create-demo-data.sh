#!/bin/bash

# Demo Data Creation Script for Knowledge Base

set -e

echo "📝 Creating demo data for Knowledge Base..."

BASE_URL="http://localhost:8080/api/v1"

# Sample tenant and project IDs (these would normally come from your auth system)
TENANT_ID="550e8400-e29b-41d4-a716-446655440000"
PROJECT_ID="550e8400-e29b-41d4-a716-446655440001"

# Function to create a sample article
create_article() {
    local title="$1"
    local content="$2"
    local tags="$3"
    
    echo "  Creating article: $title"
    
    curl -s -X POST "$BASE_URL/kb/articles" \
        -H "Content-Type: application/json" \
        -H "X-Tenant-ID: $TENANT_ID" \
        -H "X-Project-ID: $PROJECT_ID" \
        -d "{
            \"title\": \"$title\",
            \"content\": \"$content\",
            \"tags\": [$tags],
            \"is_public\": true,
            \"status\": \"published\"
        }" > /dev/null && echo "  ✅ Created: $title" || echo "  ❌ Failed: $title"
}

# Create sample categories
echo "📁 Creating categories..."

curl -s -X POST "$BASE_URL/kb/categories" \
    -H "Content-Type: application/json" \
    -H "X-Tenant-ID: $TENANT_ID" \
    -H "X-Project-ID: $PROJECT_ID" \
    -d '{
        "name": "Getting Started",
        "description": "Basic information to get started"
    }' > /dev/null && echo "  ✅ Created category: Getting Started"

curl -s -X POST "$BASE_URL/kb/categories" \
    -H "Content-Type: application/json" \
    -H "X-Tenant-ID: $TENANT_ID" \
    -H "X-Project-ID: $PROJECT_ID" \
    -d '{
        "name": "Troubleshooting",
        "description": "Common issues and solutions"
    }' > /dev/null && echo "  ✅ Created category: Troubleshooting"

# Create sample articles
echo "📄 Creating sample articles..."

create_article \
    "How to Reset Your Password" \
    "To reset your password:\n\n1. Go to the login page\n2. Click 'Forgot Password'\n3. Enter your email address\n4. Check your email for reset instructions\n5. Follow the link in the email\n6. Create a new password\n\nYour new password must be at least 8 characters long and contain both letters and numbers." \
    "\"password\", \"reset\", \"login\", \"security\""

create_article \
    "How to Create a Support Ticket" \
    "Creating a support ticket is easy:\n\n1. Log into your account\n2. Navigate to the Support section\n3. Click 'Create New Ticket'\n4. Fill in the required information:\n   - Subject: Brief description of your issue\n   - Priority: Low, Normal, High, or Urgent\n   - Description: Detailed explanation of the problem\n5. Attach any relevant files\n6. Click 'Submit Ticket'\n\nYou will receive an email confirmation with your ticket number." \
    "\"ticket\", \"support\", \"help\", \"create\""

create_article \
    "Understanding Ticket Priorities" \
    "Ticket priorities help us handle your requests appropriately:\n\n**Urgent**: System down, blocking critical business operations\n- Response time: 1 hour\n- Resolution time: 4 hours\n\n**High**: Significant impact on operations\n- Response time: 4 hours\n- Resolution time: 24 hours\n\n**Normal**: Standard issues and requests\n- Response time: 24 hours\n- Resolution time: 72 hours\n\n**Low**: Minor issues, feature requests\n- Response time: 48 hours\n- Resolution time: 1 week\n\nPlease select the appropriate priority to ensure timely handling." \
    "\"priority\", \"urgent\", \"high\", \"normal\", \"low\", \"sla\""

create_article \
    "Setting Up Two-Factor Authentication" \
    "Two-factor authentication (2FA) adds an extra layer of security to your account:\n\n**Step 1: Enable 2FA**\n1. Go to Account Settings\n2. Click on Security tab\n3. Find Two-Factor Authentication section\n4. Click 'Enable 2FA'\n\n**Step 2: Set up authenticator app**\n1. Download an authenticator app (Google Authenticator, Authy, etc.)\n2. Scan the QR code with your app\n3. Enter the 6-digit code from your app\n4. Save your backup codes in a safe place\n\n**Step 3: Test your setup**\n1. Log out of your account\n2. Log back in with your password\n3. Enter the code from your authenticator app\n\nYour account is now secured with 2FA!" \
    "\"2fa\", \"security\", \"authentication\", \"setup\""

create_article \
    "Troubleshooting Login Issues" \
    "Having trouble logging in? Try these solutions:\n\n**Check your credentials**\n- Verify your email address is correct\n- Ensure Caps Lock is off\n- Try typing your password in a text editor first\n\n**Clear browser data**\n- Clear cookies and cache\n- Try incognito/private browsing mode\n- Disable browser extensions temporarily\n\n**Check account status**\n- Your account might be temporarily locked\n- Check for password expiration notices\n- Verify your account is still active\n\n**Reset your password**\n- Use the 'Forgot Password' link\n- Check your spam folder for the reset email\n- Ensure the reset link hasn't expired\n\n**Still having issues?**\nContact our support team with:\n- Your email address\n- Error messages you're seeing\n- Steps you've already tried" \
    "\"login\", \"troubleshooting\", \"password\", \"access\""

create_article \
    "How to Update Your Profile Information" \
    "Keep your profile information up to date:\n\n**Personal Information**\n1. Go to Account Settings\n2. Click on Profile tab\n3. Update your:\n   - Full name\n   - Email address\n   - Phone number\n   - Time zone\n\n**Notification Preferences**\n1. Go to Notifications tab\n2. Choose your preferences for:\n   - Email notifications\n   - SMS alerts\n   - In-app notifications\n   - Weekly summaries\n\n**Company Information** (if applicable)\n1. Go to Organization tab\n2. Update:\n   - Company name\n   - Department\n   - Job title\n   - Manager information\n\n**Remember to save your changes!**\nClick 'Save Changes' at the bottom of each section." \
    "\"profile\", \"update\", \"account\", \"settings\""

echo ""
echo "🎉 Demo data created successfully!"
echo ""
echo "You can now test the knowledge base by:"
echo "1. Visiting http://localhost:5174 (public view)"
echo "2. Using the search API at http://localhost:8080/api/v1/kb/search"
echo "3. Testing AI Q&A at http://localhost:8081/api/v1/ai/answer"
echo ""
echo "Example search:"
echo "curl -X POST http://localhost:8080/api/v1/kb/search \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'X-Tenant-ID: $TENANT_ID' \\"
echo "  -H 'X-Project-ID: $PROJECT_ID' \\"
echo "  -d '{\"query\": \"password reset\", \"limit\": 5}'"
