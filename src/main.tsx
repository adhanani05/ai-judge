import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import "./index.css";

import Navbar from "./components/Navbar";
import UploadPage from "./routes/UploadPage";
import JudgesPage from "./routes/JudgesPage";
import RunEvaluationsPage from "./routes/RunEvaluationsPage";
import AssignJudgesPage from "./routes/AssignJudgesPage";
import ResultsPage from "./routes/ResultsPage";

const Layout = () => {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { path: "/", element: <UploadPage /> },
      { path: "/judges", element: <JudgesPage /> },
      { path: "/run", element: <RunEvaluationsPage /> },
      { path: "/assign", element: <AssignJudgesPage /> },
      { path: "/results", element: <ResultsPage /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
