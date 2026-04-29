# Fullstack Todo Website

🌐Deploy: https://flow-task-website.vercel.app/

Production-ready todo website with:

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- Auth: JWT
- Features: CRUD task, filter, search, sort, pagination, Kanban board drag and drop, subtasks with progress tracking, due-date reminders
- Security rule: each user can only access their own tasks

## Project structure

```text
todo-app/
├── backend/
│   ├── package.json
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       ├── utils/
│       ├── app.js
│       └── server.js
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── api/
│       ├── components/
│       ├── context/
│       ├── hooks/
│       ├── pages/
│       └── styles/
├── scripts/
│   └── verify-imports.mjs
└── README.md
```

## Backend setup

1. Open terminal at `backend`.
2. Install packages:

```bash
npm install
```

3. Copy env file:

```powershell
Copy-Item .env.example .env
```

4. Update `.env` values:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/todo-app
JWT_SECRET=456fc2e7a8d9e41efa56045778a85190696ef22ceb09e2b4cb21f5d7b9a526a4310f362a8ffa3d164e6315bc5733acf9176da25d9147fac2f00451ad2980f737
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

5. Run backend:

```bash
npm run dev
```

## Frontend setup

1. Open terminal at `frontend`.
2. Install packages:

```bash
npm install
```

3. Copy env file:

```powershell
Copy-Item .env.example .env
```

4. Run frontend:

```bash
npm run dev
```

By default the frontend uses `VITE_API_URL=http://localhost:5000/api`.

## Main API endpoints

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Tasks

- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/:id/status`
- `POST /api/tasks/:id/subtasks`
- `PATCH /api/tasks/:taskId/subtasks/:subtaskId`
- `DELETE /api/tasks/:taskId/subtasks/:subtaskId`
- `GET /api/tasks/:id`
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id`

## Query params for task listing

`GET /api/tasks?page=1&limit=10&status=todo&priority=high&search=report&sortBy=dueDate&sortOrder=asc`

Supported params:

- `page`
- `limit`
- `status`
- `priority`
- `search`
- `sortBy`
- `sortOrder`

## Production notes

- All task queries are scoped by `owner: req.user._id`
- Passwords are hashed with `bcryptjs`
- JWT tokens are validated in auth middleware
- Rate limit, `helmet`, `cors`, and centralized error handling are enabled
- Frontend stores JWT locally and sends it with every protected request
- The dashboard supports both list mode and drag-and-drop Kanban mode
- Tasks support subtasks, auto-computed completion percentage, and checklist-style progress UI
- A node-cron scheduler checks every 5 minutes for overdue or due-soon tasks and logs simulated reminders

## Verification

From the project root, run the import checker:

```bash
node scripts/verify-imports.mjs
```

You can also run lint later after installing dependencies:

```bash
cd backend && npm run lint
cd frontend && npm run lint
```
