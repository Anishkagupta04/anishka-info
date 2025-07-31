# GAIL SmartLearn - Deployment Guide

This guide provides comprehensive instructions for deploying GAIL SmartLearn in various environments.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Development Deployment](#development-deployment)
- [Production Deployment](#production-deployment)
- [Cloud Deployment](#cloud-deployment)
- [Docker Deployment](#docker-deployment)
- [Security Configuration](#security-configuration)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)

## 🔧 Prerequisites

### System Requirements

- **Operating System**: Linux (Ubuntu 20.04+), macOS, or Windows with WSL2
- **Node.js**: Version 16.0 or higher
- **Python**: Version 3.8 or higher
- **MongoDB**: Version 4.4 or higher
- **Redis**: Version 6.0 or higher (optional, for caching)
- **FFmpeg**: For video processing
- **Nginx**: For production reverse proxy

### Hardware Requirements

#### Development Environment
- **CPU**: 2+ cores
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 50GB available space
- **Network**: Stable internet connection

#### Production Environment
- **CPU**: 4+ cores (8+ recommended)
- **RAM**: 16GB minimum, 32GB recommended
- **Storage**: 500GB+ SSD storage
- **Network**: High-bandwidth connection (1Gbps+)

## ⚙️ Environment Setup

### 1. Install System Dependencies

#### Ubuntu/Debian
```bash
# Update package list
sudo apt update

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python and pip
sudo apt install python3 python3-pip python3-venv

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org

# Install Redis
sudo apt install redis-server

# Install FFmpeg
sudo apt install ffmpeg

# Install Nginx
sudo apt install nginx
```

#### macOS
```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install node python@3.9 mongodb/brew/mongodb-community redis ffmpeg nginx
```

### 2. Clone and Setup Project

```bash
# Clone the repository
git clone <repository-url>
cd gail-smartlearn

# Run setup script
chmod +x setup.sh
./setup.sh
```

## 🚀 Development Deployment

### Quick Start

1. **Configure Environment Variables**
```bash
cp .env.example .env
# Edit .env with your configuration
nano .env
```

2. **Setup Database**
```bash
# Start MongoDB
sudo systemctl start mongod

# Setup database indexes and admin user
node setup-db.js
```

3. **Start Development Servers**
```bash
# Start all services
./start-dev.sh
```

### Manual Development Setup

1. **Start Backend Services**
```bash
# Terminal 1: Backend API
npm run server

# Terminal 2: AI Processing Service
cd ai-processing
python3 main.py

# Terminal 3: Frontend
cd client
npm run dev
```

2. **Access Applications**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- AI Service: http://localhost:8000

## 🏭 Production Deployment

### 1. Server Preparation

```bash
# Create application user
sudo useradd -m -s /bin/bash gaillearn
sudo usermod -aG sudo gaillearn

# Create application directory
sudo mkdir -p /opt/gail-smartlearn
sudo chown gaillearn:gaillearn /opt/gail-smartlearn

# Switch to application user
su - gaillearn
cd /opt/gail-smartlearn
```

### 2. Application Setup

```bash
# Clone and setup application
git clone <repository-url> .
chmod +x setup.sh
./setup.sh

# Build for production
./build.sh
```

### 3. Process Management with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'gail-api',
      script: './server/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      instances: 'max',
      exec_mode: 'cluster',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_file: './logs/api-combined.log',
      time: true
    },
    {
      name: 'gail-ai',
      script: 'python3',
      args: 'main.py',
      cwd: './ai-processing',
      env: {
        PYTHONPATH: './ai-processing'
      },
      instances: 1,
      error_file: './logs/ai-error.log',
      out_file: './logs/ai-out.log',
      log_file: './logs/ai-combined.log',
      time: true
    }
  ]
}
EOF

# Start applications
mkdir -p logs
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 4. Nginx Configuration

```bash
# Create Nginx configuration
sudo tee /etc/nginx/sites-available/gail-smartlearn << 'EOF'
server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL Configuration
    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    
    # Serve static files
    location / {
        root /opt/gail-smartlearn/client/dist;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API endpoints
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # AI processing endpoints
    location /ai/ {
        proxy_pass http://localhost:8000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 600s;
        proxy_connect_timeout 75s;
    }
    
    # File uploads
    location /uploads/ {
        alias /opt/gail-smartlearn/uploads/;
        expires 1y;
        add_header Cache-Control "public";
    }
    
    # Socket.io
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # File size limits
    client_max_body_size 500M;
}
EOF

# Enable site and restart Nginx
sudo ln -s /etc/nginx/sites-available/gail-smartlearn /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## ☁️ Cloud Deployment

### AWS Deployment

#### 1. EC2 Instance Setup

```bash
# Launch EC2 instance (t3.large or larger recommended)
# Configure security groups:
# - HTTP (80): 0.0.0.0/0
# - HTTPS (443): 0.0.0.0/0
# - SSH (22): Your IP only
# - Custom TCP (5000, 8000): Internal only

# Connect to instance
ssh -i your-key.pem ubuntu@your-instance-ip
```

#### 2. Database Setup (MongoDB Atlas)

```bash
# Create MongoDB Atlas cluster
# Get connection string and update .env file
echo "MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/gail_smartlearn" >> .env
```

#### 3. S3 Storage Setup

```bash
# Create S3 bucket for file storage
# Update .env with S3 credentials
echo "AWS_ACCESS_KEY_ID=your-access-key" >> .env
echo "AWS_SECRET_ACCESS_KEY=your-secret-key" >> .env
echo "AWS_S3_BUCKET=gail-smartlearn-storage" >> .env
```

### Google Cloud Platform

#### 1. Compute Engine Setup

```bash
# Create VM instance
gcloud compute instances create gail-smartlearn \
    --zone=us-central1-a \
    --machine-type=n1-standard-4 \
    --image-family=ubuntu-2004-lts \
    --image-project=ubuntu-os-cloud \
    --boot-disk-size=100GB \
    --tags=http-server,https-server
```

#### 2. Cloud Storage Setup

```bash
# Create storage bucket
gsutil mb gs://gail-smartlearn-storage

# Set up service account for storage access
```

### Azure Deployment

#### 1. Virtual Machine Setup

```bash
# Create resource group
az group create --name gail-smartlearn-rg --location eastus

# Create VM
az vm create \
    --resource-group gail-smartlearn-rg \
    --name gail-smartlearn-vm \
    --image UbuntuLTS \
    --size Standard_D4s_v3 \
    --admin-username azureuser \
    --ssh-key-values ~/.ssh/id_rsa.pub
```

## 🐳 Docker Deployment

### 1. Create Dockerfiles

#### Backend Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose port
EXPOSE 5000

# Start application
CMD ["npm", "start"]
```

#### Frontend Dockerfile
```dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY client/package*.json ./
RUN npm ci

COPY client/ .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### AI Processing Dockerfile
```dockerfile
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ai-processing/ .

# Expose port
EXPOSE 8000

# Start application
CMD ["python", "main.py"]
```

### 2. Docker Compose Configuration

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    container_name: gail-mongo
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    volumes:
      - mongodb_data:/data/db
    ports:
      - "27017:27017"

  redis:
    image: redis:7-alpine
    container_name: gail-redis
    restart: unless-stopped
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

  backend:
    build: .
    container_name: gail-backend
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://admin:password@mongodb:27017/gail_smartlearn?authSource=admin
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./uploads:/app/uploads
    ports:
      - "5000:5000"
    depends_on:
      - mongodb
      - redis

  ai-service:
    build:
      context: .
      dockerfile: ai-processing/Dockerfile
    container_name: gail-ai
    restart: unless-stopped
    volumes:
      - ./uploads:/app/uploads
    ports:
      - "8000:8000"
    depends_on:
      - mongodb

  frontend:
    build:
      context: .
      dockerfile: client/Dockerfile
    container_name: gail-frontend
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  mongodb_data:
  redis_data:
```

### 3. Deploy with Docker Compose

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Update services
docker-compose pull
docker-compose up -d
```

## 🔒 Security Configuration

### 1. Environment Variables Security

```bash
# Set secure permissions for .env file
chmod 600 .env
chown gaillearn:gaillearn .env
```

### 2. Database Security

```bash
# Enable MongoDB authentication
# Create admin user in MongoDB
mongo admin --eval "
  db.createUser({
    user: 'admin',
    pwd: 'secure_password',
    roles: [{ role: 'root', db: 'admin' }]
  })
"

# Enable authentication in MongoDB config
sudo tee -a /etc/mongod.conf << 'EOF'
security:
  authorization: enabled
EOF

sudo systemctl restart mongod
```

### 3. SSL Certificate Setup

```bash
# Using Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 4. Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## 📊 Monitoring & Maintenance

### 1. Log Management

```bash
# Setup log rotation
sudo tee /etc/logrotate.d/gail-smartlearn << 'EOF'
/opt/gail-smartlearn/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

### 2. Backup Strategy

```bash
# Create backup script
sudo tee /opt/gail-smartlearn/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/gail-smartlearn"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup MongoDB
mongodump --host localhost --port 27017 --out $BACKUP_DIR/mongodb_$DATE

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz uploads/

# Backup application code (excluding node_modules)
tar --exclude='node_modules' --exclude='logs' -czf $BACKUP_DIR/app_$DATE.tar.gz .

# Clean old backups (keep 7 days)
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x backup.sh

# Setup cron job for daily backups
echo "0 2 * * * /opt/gail-smartlearn/backup.sh" | crontab -
```

### 3. Monitoring Setup

```bash
# Install monitoring tools
npm install -g pm2-logrotate
pm2 install pm2-server-monit
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Check what's using the port
sudo lsof -i :5000
sudo lsof -i :8000

# Kill process if needed
sudo kill -9 <PID>
```

#### 2. Permission Errors
```bash
# Fix file permissions
sudo chown -R gaillearn:gaillearn /opt/gail-smartlearn
chmod -R 755 /opt/gail-smartlearn
chmod 600 /opt/gail-smartlearn/.env
```

#### 3. MongoDB Connection Issues
```bash
# Check MongoDB status
sudo systemctl status mongod

# Check logs
sudo journalctl -u mongod

# Restart MongoDB
sudo systemctl restart mongod
```

#### 4. Out of Disk Space
```bash
# Check disk usage
df -h

# Clean PM2 logs
pm2 flush

# Clean old uploads
find uploads/ -type f -mtime +30 -delete
```

### Performance Optimization

#### 1. Database Optimization
```bash
# Add database indexes (already in setup-db.js)
# Monitor slow queries
# Use MongoDB Compass for performance insights
```

#### 2. File Storage Optimization
```bash
# Move uploads to separate partition/storage
# Implement CDN for static assets
# Use video compression for large files
```

#### 3. Memory Optimization
```bash
# Monitor memory usage
free -h
pm2 monit

# Adjust PM2 instances based on available memory
# Use clustering for CPU-intensive tasks
```

## 📞 Support & Maintenance

For ongoing support and maintenance:

1. **Regular Updates**: Keep dependencies updated
2. **Security Patches**: Apply security updates promptly
3. **Performance Monitoring**: Monitor system performance
4. **Backup Verification**: Regularly test backup restoration
5. **Documentation**: Keep deployment documentation updated

## 📚 Additional Resources

- [MongoDB Production Deployment](https://docs.mongodb.com/manual/administration/production-notes/)
- [Node.js Production Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [Nginx Configuration Guide](https://nginx.org/en/docs/)
- [PM2 Process Management](https://pm2.keymetrics.io/docs/)
- [Docker Best Practices](https://docs.docker.com/develop/best-practices/)

---

For technical support or questions about deployment, please contact the development team or create an issue in the project repository.