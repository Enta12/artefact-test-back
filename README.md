# Artefact Backend


## 🚀 Features

- **User Authentication**: JWT-based authentication with secure password hashing
- **Project Management**: Create and manage projects with team collaboration
- **Task Management**: Kanban-style task organization with columns, priorities, and assignments
- **Tag System**: Color-coded tags for task categorization
- **Role-based Access**: Different user roles (ADMIN, MEMBER) for project management
- **RESTful API**: Clean and well-documented API endpoints
- **Database**: PostgreSQL with Prisma ORM for type-safe database operations

## 🛠️ Tech Stack

- **Framework**: NestJS 11
- **Database**: PostgreSQL with Prisma ORM (Neon)
- **Authentication**: JWT with Passport.js
- **Validation**: Class-validator and class-transformer
- **Testing**: Jest for unit and e2e tests
- **Deployment**: Google Cloud Run with Docker

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **PostgreSQL** database
- **Docker** (for containerized deployment)

## 🏃‍♂️ Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd artefact-back
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/artefact_db"

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key"

# Application
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

### 4. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

```

### 5. Start the Application

#### Development Mode
```bash
npm run start:dev
```

#### Production Mode
```bash
npm run build
npm run start:prod
```

The application will be available at `http://localhost:5000`

## 🐳 Docker

### Build the Image

```bash
docker build -t artefact-backend .
```

### Run with Docker

```bash
docker run -p 5000:5000 \
  -e DATABASE_URL="your-database-url" \
  -e JWT_SECRET="your-jwt-secret" \
  artefact-backend
```



Run with:
```bash
docker-compose up -d
```

## 🚀 Deployment

### Google Cloud Run

This project is configured for automatic deployment to Google Cloud Run via GitHub Actions.

#### Prerequisites

1. **Google Cloud Project** with the following APIs enabled:
   - Cloud Run API
   - Artifact Registry API
   - Cloud Build API

2. **Service Account** with the following roles:
   - Cloud Run Admin
   - Artifact Registry Admin
   - Service Account User

3. **GitHub Secrets** configured:
   - `GCP_PROJECT_ID`: Your Google Cloud Project ID
   - `GCP_SA_KEY`: Service account key (JSON format)
   - `PORT`: Application port (default: 5000)

#### Automatic Deployment

The application automatically deploys to Cloud Run when you push to the `main` branch. The deployment process:

1. Builds the Docker image
2. Pushes to Google Artifact Registry
3. Deploys to Cloud Run with the following configuration:
   - **Memory**: 512Mi
   - **CPU**: 1 vCPU
   - **Timeout**: 300 seconds
   - **Concurrency**: 80 requests
   - **Max Instances**: 10


### Environment Variables for Production

Set these environment variables in your Cloud Run service:

```env
DATABASE_URL="your-production-database-url"
JWT_SECRET="your-production-jwt-secret"
NODE_ENV="production"
FRONTEND_URL="https://your-frontend-domain.com"
```

## 📚 API Documentation

### Authentication Endpoints

- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login user
- `POST /auth/logout` - Logout user

### Project Endpoints

- `GET /projects` - Get all projects for the authenticated user
- `POST /projects` - Create a new project
- `GET /projects/:id` - Get project details
- `PUT /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project

### Task Endpoints

- `GET /tasks` - Get all tasks for a project
- `POST /tasks` - Create a new task
- `PUT /tasks/:id` - Update task
- `DELETE /tasks/:id` - Delete task

### Column Endpoints

- `GET /columns` - Get all columns for a project
- `POST /columns` - Create a new column
- `PUT /columns/:id` - Update column
- `DELETE /columns/:id` - Delete column


### Available Scripts

- `npm run build` - Build the application
- `npm run start` - Start the application
- `npm run start:dev` - Start in development mode with hot reload
- `npm run start:debug` - Start in debug mode
- `npm run start:prod` - Start in production mode
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run test` - Run tests
