#!/bin/bash

# GAIL SmartLearn Setup Script
# This script sets up the complete development environment for GAIL SmartLearn

echo "🚀 Setting up GAIL SmartLearn - Mentorship + Learning Module Integration"
echo "================================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js (v16 or higher) first."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher first."
    exit 1
fi

# Check if MongoDB is running (optional - can use cloud MongoDB)
if command -v mongod &> /dev/null; then
    echo "✅ MongoDB found"
else
    echo "⚠️  MongoDB not found locally. Make sure to configure MongoDB URI in environment variables."
fi

echo ""
echo "📦 Installing Backend Dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install backend dependencies"
    exit 1
fi

echo ""
echo "📦 Installing Frontend Dependencies..."
cd client
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi

cd ..

echo ""
echo "🐍 Installing Python Dependencies..."
pip3 install -r requirements.txt

if [ $? -ne 0 ]; then
    echo "❌ Failed to install Python dependencies"
    exit 1
fi

echo ""
echo "⚙️  Setting up Environment Variables..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file from template"
    echo "📝 Please update the .env file with your configuration:"
    echo "   - MongoDB URI"
    echo "   - JWT Secret"
    echo "   - Email configuration"
    echo "   - API keys (OpenAI, Azure, AWS if using)"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "📁 Creating Upload Directories..."
mkdir -p uploads/videos uploads/audio uploads/thumbnails uploads/transcripts
echo "✅ Upload directories created"

echo ""
echo "🔧 Setting up Development Scripts..."

# Create development start script
cat > start-dev.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting GAIL SmartLearn Development Environment"
echo "=================================================="

# Start backend server in background
echo "📡 Starting Backend API Server (Port 5000)..."
npm run server &
BACKEND_PID=$!

# Start AI processing service in background
echo "🤖 Starting AI Processing Service (Port 8000)..."
cd ai-processing
python3 main.py &
AI_PID=$!
cd ..

# Start frontend development server
echo "🎨 Starting Frontend Development Server (Port 3000)..."
cd client
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ All services started!"
echo "📱 Frontend: http://localhost:3000"
echo "🔌 Backend API: http://localhost:5000"
echo "🤖 AI Service: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping all services..."
    kill $BACKEND_PID $AI_PID $FRONTEND_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for processes
wait
EOF

chmod +x start-dev.sh

# Create production build script
cat > build.sh << 'EOF'
#!/bin/bash

echo "🏗️  Building GAIL SmartLearn for Production"
echo "=========================================="

echo "📦 Installing production dependencies..."
npm ci

echo "🎨 Building frontend..."
cd client
npm run build
cd ..

echo "🧹 Cleaning up development files..."
rm -rf node_modules/nodemon

echo "✅ Production build completed!"
echo "📂 Frontend build: client/dist"
echo "🚀 Ready for deployment"
EOF

chmod +x build.sh

echo "✅ Development scripts created"

echo ""
echo "🧪 Setting up Database Indexes..."

# Create MongoDB setup script
cat > setup-db.js << 'EOF'
// MongoDB Setup Script for GAIL SmartLearn
// Run with: node setup-db.js

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gail_smartlearn';

async function setupDatabase() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    
    // Create indexes for better performance
    console.log('📊 Creating database indexes...');
    
    // User indexes
    await db.collection('users').createIndexes([
      { key: { employeeId: 1 }, unique: true },
      { key: { email: 1 }, unique: true },
      { key: { department: 1, role: 1 } },
      { key: { 'mentorProfile.expertise.domain': 1 } }
    ]);
    
    // Session indexes
    await db.collection('sessions').createIndexes([
      { key: { mentor: 1, scheduledDate: 1 } },
      { key: { domain: 1, skillLevel: 1 } },
      { key: { status: 1, scheduledDate: 1 } },
      { key: { 'registeredParticipants.userId': 1 } },
      { key: { tags: 1 } }
    ]);
    
    // Learning Module indexes
    await db.collection('learningmodules').createIndexes([
      { key: { domain: 1, skillLevel: 1 } },
      { key: { status: 1, publishedAt: 1 } },
      { key: { 'content.autoTags': 1 } },
      { key: { 'content.manualTags': 1 } },
      { key: { originalMentor: 1 } },
      { key: { sourceSession: 1 } },
      { key: { '$**': 'text' } } // Text search index
    ]);
    
    console.log('✅ Database indexes created successfully');
    
    // Create default admin user if none exists
    const adminExists = await db.collection('users').findOne({ role: 'super_admin' });
    
    if (!adminExists) {
      console.log('👤 Creating default admin user...');
      const bcrypt = require('bcryptjs');
      const adminPassword = await bcrypt.hash('admin123', 12);
      
      await db.collection('users').insertOne({
        employeeId: 'ADMIN001',
        email: 'admin@gail.com',
        password: adminPassword,
        firstName: 'System',
        lastName: 'Administrator',
        department: 'IT',
        designation: 'System Administrator',
        role: 'super_admin',
        permissions: ['create_session', 'manage_users', 'view_analytics', 'moderate_content', 'manage_assessments'],
        isActive: true,
        isEmailVerified: true,
        skillLevel: 'Expert',
        interests: [],
        completedModules: [],
        badges: [],
        lastActive: new Date(),
        totalLearningTime: 0,
        sessionsAttended: [],
        preferences: {
          emailNotifications: true,
          pushNotifications: true,
          preferredLanguage: 'en',
          timezone: 'Asia/Kolkata',
          learningReminders: true
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log('✅ Default admin user created');
      console.log('📧 Email: admin@gail.com');
      console.log('🔑 Password: admin123');
      console.log('⚠️  Please change the password after first login!');
    }
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
  } finally {
    await client.close();
  }
}

setupDatabase();
EOF

echo "✅ Database setup script created"

echo ""
echo "🎉 GAIL SmartLearn Setup Complete!"
echo "================================="
echo ""
echo "📋 Next Steps:"
echo "1. Update .env file with your configuration"
echo "2. Set up MongoDB (local or cloud)"
echo "3. Run database setup: node setup-db.js"
echo "4. Start development: ./start-dev.sh"
echo ""
echo "📚 Important URLs:"
echo "• Frontend: http://localhost:3000"
echo "• Backend API: http://localhost:5000"
echo "• AI Processing: http://localhost:8000"
echo "• API Documentation: http://localhost:5000/api/docs"
echo ""
echo "📖 Default Admin Credentials:"
echo "• Email: admin@gail.com"
echo "• Password: admin123"
echo ""
echo "🔧 Useful Commands:"
echo "• Start development: ./start-dev.sh"
echo "• Build for production: ./build.sh"
echo "• Setup database: node setup-db.js"
echo ""
echo "📞 For support, please refer to the README.md file"
echo ""
echo "Happy Learning! 🎓"