# BeanScan Frontend: Coffee Bean Defect Classification Platform

The frontend for BeanScan (DOST-CBASS) is a specialized web application built with Next.js for the detection, annotation, and classification of defects in Robusta coffee beans. It provides a complete workflow from image management to model training and inference.

## Project Overview

*   **Goal:** Provide an intuitive interface for experts to annotate coffee bean defects and manage the YOLOv8-based classification lifecycle.
*   **Architecture:** A Single Page Application (SPA) architecture within Next.js. Views are dynamically swapped based on the application state rather than traditional route transitions.
*   **State Management:** 
    *   `AuthContext`: Manages user authentication, tokens, and profile data (currently using a mock implementation).
    *   `AppContext`: Manages the global state including the active view, image datasets, bounding box annotations, and training metrics.
*   **Key Features:**
    *   **Dashboard:** Real-time statistics on annotations and model performance.
    *   **Upload:** Batch image uploading for dataset expansion.
    *   **Annotate:** High-performance canvas-based annotation tool with keyboard shortcuts for 16 defect classes.
    *   **Train:** Configuration and monitoring of YOLOv8 model training sessions.
    *   **Detect:** Real-time inference testing on uploaded images.
    *   **Registry:** Version control and performance tracking for trained models.

## Tech Stack

*   **Framework:** Next.js 16 (React 19, TypeScript)
*   **Styling:** Tailwind CSS + Radix UI (via Shadcn UI)
*   **Icons:** Lucide-React
*   **State:** React Context API
*   **Visualization:** Recharts (for training metrics and distributions)

## Building and Running

### Prerequisites
*   Node.js 18+ 
*   npm or pnpm

### Key Commands
*   **Development:** `npm run dev` - Starts the development server at `http://localhost:3000`.
*   **Build:** `npm run build` - Creates an optimized production build.
*   **Start:** `npm run start` - Runs the built production application.
*   **Lint:** `npm run lint` - Runs ESLint for code quality checks.

## Development Conventions

*   **View-Based Architecture:** All major features are located in the `views/` directory. Avoid adding complex logic directly to `app/page.tsx`.
*   **Component Usage:** Prefer using established UI primitives in `components/ui/`. If a new UI component is needed, follow the Shadcn/Radix pattern.
*   **Domain Constants:** Defect classes, model definitions, and initial states must be maintained in `lib/constants.ts` to ensure consistency across the app.
*   **Type Safety:** Strict TypeScript interfaces are defined in `lib/types.ts`. Always use these for props and state.
*   **Annotation Tool:** The canvas logic is decoupled into `lib/canvas-utils.ts`. Any changes to drawing behavior or coordinate scaling should be made there.
*   **Styling:** The application is dark-mode only (forced by the `dark` class in `RootLayout`). Use Tailwind's utility classes and CSS variables defined in `globals.css`.

## Directory Structure

*   `app/`: Next.js App Router root, layout, and global styles.
*   `components/`: Reusable UI components and layout elements (Sidebar, TopBar).
*   `context/`: React Context providers for global state and authentication.
*   `hooks/`: Custom React hooks (e.g., `use-toast`, `use-mobile`).
*   `lib/`: Utility functions, constants, and TypeScript types.
*   `views/`: Feature-specific components that act as "pages".
*   `public/`: Static assets including logos and default icons.
