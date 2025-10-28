#!/bin/bash

# Create functions/.env file

cat > functions/.env << 'EOF'
# EPA AQS Credentials (OPTIONAL - for real-time official ACHD data)
# Register at: https://aqs.epa.gov/aqsweb/documents/registering.html
# Once registered, add your email and key below for real ACHD data
EPA_AQS_EMAIL=
EPA_AQS_KEY=

# OpenAQ API Key (OPTIONAL - alternative data source)
OPENAQ_API_KEY=

# Admin Secret (for production deployment)
ADMIN_SECRET=test-admin-secret
EOF

echo "✅ Created functions/.env file"

