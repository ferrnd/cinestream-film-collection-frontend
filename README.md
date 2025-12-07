# 🎬 CineStream – Film, Series, and Nerd Classic Collection

## Project Overview

**CineStream** is a digital catalog designed to organize and present a comprehensive collection of films, series, and classic "nerd" titles. The primary goal is to provide a central resource for users to easily consult recommendations and explore new titles.

While the **Front-end** offers a read-only interface for browsing and viewing detailed information, the **Back-end** is fully equipped to handle complete maintenance and management of the collection via a robust API.

### Storytelling / Problem

The team needed an organized and easily searchable digital catalog of films and series. The solution needed to fulfill two distinct requirements:
1.  Provide a user-friendly, non-editable viewing experience for all users on the front-end (read-only access).
2.  Establish a secure, full-maintenance interface for administrators to manage the collection via a back-end API (full **CRUD** capabilities).

---

### **Front-end (Client-Side)**

| Technology | Purpose | Key Features Implemented |
| :--- | :--- | :--- |
| **HTML** | Structure | Semantic markup for content |
| **CSS** | Styling | Responsive and thematic design |
| **JavaScript (JS)** | Interactivity | Fetching data via **GET** and **GETbyID** API calls |

### **Back-end (Server-Side)**

| Technology | Purpose | Key Features Implemented |
| :--- | :--- | :--- |
| **Node.js** | Runtime Environment | Executes server-side JavaScript |
| **Express** | Web Framework | API routing and middleware management |
| **Prisma** | ORM (Object-Relational Mapper) | Type-safe database access and schema management (CRUD) |
| **PostgreSQL** | Database | Relational data storage for films and genres |
| **API** | Interface | Complete **CRUD** operations (via tools like Postman) |

---

## 🏗️ Project Scope & Data

### **Functionality**

* **Front-end:** Implements **GET** (list all) and **GETbyID** (view details) operations.
* **Back-end:** Provides a complete **CRUD** (Create, Read, Update, Delete) API for maintenance of the collection.

### **Database Schema**

The database is powered by **PostgreSQL** and its structure is defined by the following Prisma models. Note the use of **`@@map`** to define the actual table names in the database and the explicit relationships.

| Prisma Model Name | Actual Table Name | Description | Key Relationships |
| :--- | :--- | :--- | :--- |
| `Genero` | **Gêneros** | Stores the different **categories** (e.g., Action, Sci-Fi). | One-to-Many with `stream` and `StreamDB`. |
| `stream` | **Stream** | Represents film/series entries (one type of content). | Many-to-One with `Genero` (via `generoId`). |
| `StreamDB` | **StreamDB** | Represents film/series entries (a second, more detailed type of content). | Many-to-One with `Genero` (via `generoId`). |
| `Comentario` | **Comentarios** | Stores user comments for specific content cards. | No explicit foreign key defined in the model, relates via `idFilmeCard` (a String identifier). |

### **Prisma Schema Details**

Based on your schema, the relationships are structured as **One-to-Many**:

* A **`Genero`** (e.g., "Action") can be associated with **multiple** entries in both the `stream` and `StreamDB` tables.
* The `stream` and `StreamDB` models reference `Genero` using the foreign key **`generoId`**.

---

### **Content Inventory**

The catalog is comprised of both local and database-managed entries:

| Content Source | Quantity | Description |
| :--- | :--- | :--- |
| **Local Files** | 122 Streams | Initial static film data |
| **Database (PostgreSQL)** | 100 Streams | Dynamic, managed film/series data from the back-end |

---

## ⚙️ Setup and Installation (Back-end)

### 1. Repository

The back-end source code is located at: `ferrnd/cinestream-film-collection-backend`.

### 2. Dependencies

To run the back-end server, you need to install the following dependencies:

| Package | Purpose | Category |
| :--- | :--- | :--- |
| `express` | Web application framework for Node.js. | Production |
| `cors` | Provides a mechanism to enable Cross-Origin Resource Sharing. | Production |
| `dotenv` | Loads environment variables from a `.env` file. | Production |
| `@prisma/client` | The auto-generated database client for Prisma. | Production |
| `nodemon` | Automatically restarts the Node application when file changes are detected. | Development |
| `prisma` | The Prisma CLI and tools for database migration and generation. | Development |

You can install these dependencies using npm:

```bash
npm install express cors dotenv @prisma/client nodemon prisma
```

## Environment Configuration

Create a file named **.env** in the root directory of the back-end project. This file will store your database connection string

### .env Example: DATABASE_URL="postgresql://usuario:senha@localhost:5432/untiled_db"

Replace 'usuario', 'senha', 'localhost', '5432', and 'untiled_db' with your actual PostgreSQL credentials.

## Database Setup 

Follow this sequence of commands in your terminal to initialize Prisma, run the migrations, and generate the Prisma client:

prisma init --datasource-provider 
prisma migrate dev --name 
npx prisma generate
npx prisma studio

### start the back-end server using the following command: npm run dev

The server will typically run on a port (e.g., http://localhost:3000) and the API endpoints will be ready for consumption by the Front-end and management via Postman.