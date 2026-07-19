# Cybersecurity Training Platform

A full-stack cybersecurity training platform designed to help users develop practical cybersecurity skills through hands-on exercises and realistic simulations.

The platform combines **Capture The Flag (CTF) challenges**, **SOC case simulations**, **Incident Response scenarios**, **Docker-based labs**, and structured learning resources into a single web application where users can learn, practice, and track their progress.

This project was developed as my senior graduation project for the Bachelor of Science in Computer Science at the Lebanese International University (LIU).

---

# Features

## User Features

- User registration and authentication
- Secure password hashing using bcrypt
- JWT-based authentication and authorization
- Personal dashboard
- Progress tracking
- Leaderboard

---

## Training Modules

### Capture The Flag (CTF)

- Solve practical cybersecurity challenges
- Flag submission and validation
- Challenge timer
- Progress tracking

### SOC Case Simulations

- Analyze realistic security incidents
- Submit investigation results
- Practice Security Operations Center workflows

### Incident Response Scenarios

- Multi-step incident investigations
- Guided response workflow
- Step-by-step submissions

### Learning Center

- Structured cybersecurity learning paths
- Educational resources
- Course progression

### Docker Labs

- Hands-on cybersecurity labs
- Practical environments for learning

---

## Administration

Administrative dashboard allowing administrators to:

- Manage CTF challenges
- Manage SOC cases
- Manage Incident Response scenarios
- Manage Learning Center content
- View platform insights
- Review user submissions

---

# Technology Stack

## Frontend

- React.js
- Vite
- JavaScript
- HTML5
- CSS3

## Backend

- Node.js
- Express.js

## Database

- Microsoft SQL Server

## Authentication & Security

- JSON Web Tokens (JWT)
- bcrypt
- Role-Based Access Control (RBAC)

## DevOps

- Docker

## Development Tools

- Git
- GitHub
- Visual Studio Code
- SQL Server Management Studio (SSMS)

---

# Project Structure

```
cybersecurity-training-platform
│
├── frontend/                 # React frontend
├── src/                      # Express backend
├── sql/                      # Database scripts
├── docker-labs/              # Docker-based cybersecurity labs
├── package.json
├── package-lock.json
└── README.md
```

---

# System Architecture

```
                 React Frontend
                        │
                        ▼
               Express.js REST API
                        │
                        ▼
             Microsoft SQL Server
                        │
                        ▼
        Cybersecurity Training Modules

     • CTF Challenges
     • SOC Case Simulations
     • Incident Response
     • Learning Center
     • Docker Labs
```

---

# Installation

## Clone the repository

```bash
git clone https://github.com/omaratiehcs/cybersecurity-training-platform.git
```

## Navigate to the project

```bash
cd cybersecurity-training-platform
```

---

## Backend

Install dependencies:

```bash
npm install
```

Start the backend server:

```bash
npm start
```

---

## Frontend

Navigate to the frontend folder:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

---

# Database

Create a Microsoft SQL Server database and execute the SQL scripts located in the `sql` directory.

The project includes scripts for:

- Learning Center
- Challenge Timer
- Contact Messages
- Contact Replies
- Platform Reviews

---

# Docker Labs

The project includes Docker-based cybersecurity labs designed to provide practical learning experiences.

Example included:

- Hidden Comment Lab

---

# Skills Demonstrated

This project demonstrates practical experience with:

- Full-stack web development
- REST API development
- React.js frontend development
- Express.js backend development
- Microsoft SQL Server database design
- JWT authentication
- Password hashing with bcrypt
- Role-Based Access Control (RBAC)
- Docker containerization
- Cybersecurity training platform design
- Secure application development
- Database integration
- CRUD operations
- Git version control

---

# Future Improvements

Potential future enhancements include:

- Multi-factor authentication (MFA)
- Email verification
- Password reset functionality
- User achievements and badges
- Additional Docker labs
- Expanded Learning Center
- More CTF challenges
- Additional SOC case scenarios
- API documentation
- Automated testing
- CI/CD pipeline
- Cloud deployment

---

# Screenshots

Screenshots of the platform will be added soon.

---

# License

This project is provided for educational and portfolio purposes.
