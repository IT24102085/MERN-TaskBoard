# MERN TaskBoard

TaskBoard is a full-stack project management dashboard built with the MERN stack. Authenticated users can organize projects, create and manage project tasks, set task priorities and statuses, assign due dates, and search or filter their task list.

## Features

- User registration and login with JWT authentication.
- Password hashing and protected API routes.
- Project creation, editing, viewing, and deletion.
- Project-specific task views.
- Task creation, editing, deletion, status, priority, and optional due dates.
- Overdue and due-today task indicators.
- In-app notifications for due-today and overdue task reminders.
- In-app notifications for project and task creation, updates, completion, and deletion.
- Authenticated analytics reports with task metrics, status/priority breakdowns, project progress, filters, and CSV export.
- Optional task assignment with safe assignee display data and assignment notifications.
- Task title search with combined status and priority filters.
- Dashboard summary cards for projects and task progress.
- Responsive React dashboard layout.
- Authenticated ownership checks for projects and their tasks.
- Authentication rate limiting and login lockout responses.

## Technologies

- MongoDB and Mongoose
- Express.js
- React
- Node.js
- Vite
- JSON Web Tokens (JWT)
- bcryptjs

## Project structure

```text
MERN-TaskBoard/
├── client/
│   ├── src/
│   │   ├── assets/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── src/
│   │   ├── middleware/
│   │   │   └── authMiddleware.js
│   │   ├── models/
│   │   │   ├── Project.js
│   │   │   ├── Notification.js
│   │   │   ├── Task.js
│   │   │   └── User.js
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── notificationRoutes.js
│   │   │   ├── analyticsRoutes.js
│   │   │   ├── userRoutes.js
│   │   │   ├── projectRoutes.js
│   │   │   └── taskRoutes.js
│   │   ├── services/
│   │   │   └── notificationService.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
├── .gitignore
└── README.md
```

## Prerequisites

- Node.js and npm compatible with the installed Vite version. Node.js 20.19 or newer is recommended.
- A MongoDB database, either a local MongoDB server or MongoDB Atlas.
- PowerShell, Command Prompt, or a Unix-compatible shell.

## Installation

Clone the repository and install dependencies in both application folders:

```powershell
git clone <your-repository-url>
cd MERN-TaskBoard

cd server
npm install

cd ..\client
npm install
```

## Server environment configuration

From the project root, copy the example file without committing the resulting `.env` file:

```powershell
Copy-Item .\server\.env.example .\server\.env
```

Edit `server/.env` locally with your own values:

```text
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/taskboard
JWT_SECRET=replace-with-a-long-random-secret
FRONTEND_ORIGIN=http://localhost:5173
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=10
AUTH_LOCKOUT_MS=900000
AUTH_LOCKOUT_FAILURES=5
```

For production, set `MONGODB_URI` and `JWT_SECRET` through the hosting provider's secret manager. Both `mongodb://` and `mongodb+srv://` connection strings are supported. On Railway, use the MongoDB service's connection variable (for example, `${{MongoDB.MONGO_URL}}`) as the value of `MONGODB_URI`; do not copy credentials into source code. Set `FRONTEND_ORIGIN` to the exact deployed frontend origin, such as `https://taskboard.example.com`. Multiple trusted origins may be comma-separated. Do not use `*` for authenticated browser requests.

The backend readiness endpoint is `GET /health`. It returns HTTP 200 only after MongoDB is connected, and HTTP 503 while the service is not ready.

Never commit real `.env` files, database credentials, JWT secrets, tokens, or private keys. `server/.env.example` contains placeholders only.

## Running the application

Start the backend in one terminal:

```powershell
cd server
npm run dev
```

The API will run at `http://localhost:5000`.

Start the frontend in a second terminal:

```powershell
cd client
npm run dev
```

Open `http://localhost:5173` in a browser.

For the Vite frontend, set `VITE_API_URL` to the backend API base URL. Locally use `http://localhost:5000/api`; in production use the deployed backend URL with `/api` appended.

For a production-style frontend build:

```powershell
cd client
npm run build
npm run preview
```

The backend can be started without Nodemon using `npm start` from `server`.

## API and authentication overview

The frontend uses `http://localhost:5000/api` during development. Protected requests send the JWT in the `Authorization: Bearer <token>` header.

Authentication endpoints:

- `POST /api/auth/register` — create an account.
- `POST /api/auth/login` — authenticate and receive a JWT.

Project endpoints require authentication and enforce ownership:

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:id`
- `PUT /api/projects/:id`
- `DELETE /api/projects/:id`

Task endpoints require authentication and only expose tasks belonging to the user's projects:

- `GET /api/tasks`
- `POST /api/tasks`
- `GET /api/tasks/:id`
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id`

User lookup for task assignment:

- `GET /api/users/eligible-assignees` — return safe assignee fields for the authenticated user.

Notification endpoints require authentication and only operate on the signed-in user's notifications:

- `GET /api/notifications` — refresh reminders and retrieve recent notifications with the unread count.
- `GET /api/notifications/unread-count` — retrieve the unread count.
- `PATCH /api/notifications/:id/read` — mark one notification as read.
- `PATCH /api/notifications/read-all` — mark all notifications as read.
- `DELETE /api/notifications/:id` — delete one notification.

Analytics requires authentication and only reports tasks from projects owned by the signed-in user:

- `GET /api/analytics` — return metrics, status and priority counts, project progress, and filtered task records.
- Optional query parameters: `from=YYYY-MM-DD`, `to=YYYY-MM-DD`, and `projectId=<owned project id>`.

Analytics date ranges use the task `createdAt` field. The `to` date is inclusive. Overdue tasks are tasks with a due date before the current UTC day and a status other than `done`. The Analytics page can export the currently filtered records and summary metrics as CSV.

Task assignment uses the existing owner-only project access model. Since the application does not currently have a project membership/collaborator model, only the authenticated project owner is eligible for new assignments. Existing tasks without an assignee remain unassigned, and legacy assignments are preserved until explicitly changed or removed.

Task due dates use the `YYYY-MM-DD` format and are optional. Invalid dates are rejected by the API.

Due-date reminders are refreshed when an authenticated user loads or opens the notification panel. Reminder keys are unique per user, task, reminder type, and due date, so repeated refreshes do not create duplicates. Completed tasks and tasks without due dates do not generate reminders. Project and task lifecycle notifications are created after successful mutations and use database-backed deduplication keys.

Project and task create/update/delete operations create owner-scoped in-app notifications. Changing a task from an unfinished status to `done` also creates a `Task Completed` notification; keeping an already completed task in `done` does not create another completion notification.

## Testing the main features

1. Start MongoDB, the backend, and the frontend.
2. Register a new user and sign in.
3. Create a project, then open its details page.
4. Create tasks with different statuses, priorities, and due dates.
5. Edit and delete tasks, and verify the project task list refreshes.
6. Search tasks by title and combine the status and priority filters.
7. Verify overdue, due-today, future, and no-due-date indicators.
8. Edit and delete a project, confirming the associated-task warning.
9. Open Analytics, verify summary metrics and charts use your real task data.
10. Apply date and project filters, clear them, refresh the report, and export the filtered CSV.
11. Sign out and verify protected dashboard and analytics data is no longer visible.

Available checks:

```powershell
cd server
npm run dev

cd ..\client
npm run lint
npm run build
```

The server package currently has no automated test suite; `npm run dev` and the frontend checks above verify startup and compilation.

## GitHub submission checklist

- [ ] Remove or keep local-only `server/.env` untracked; never commit it.
- [ ] Confirm `server/.env.example` contains placeholders only.
- [ ] Run `git status` and inspect every file before committing.
- [ ] Confirm no passwords, MongoDB credentials, JWT secrets, tokens, or private keys appear in the staged diff.
- [ ] Confirm `node_modules`, `dist`, logs, coverage, and local environment files are ignored.
- [ ] Run `npm install` in both `server` and `client` from a clean checkout.
- [ ] Run the backend and frontend checks listed above.
- [ ] Add and push the repository only after reviewing the staged files.
