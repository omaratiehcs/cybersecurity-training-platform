import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ResendVerificationPage from "./pages/ResendVerificationPage";
import DashboardPage from "./pages/DashboardPage";
import TutorialsPage from "./pages/TutorialsPage";
import CourseDetailsPage from "./pages/CourseDetailsPage";
import TutorialDetailsPage from "./pages/TutorialDetailsPage";
import ChallengesPage from "./pages/ChallengesPage";
import ChallengeDetailsPage from "./pages/ChallengeDetailsPage";
import ProgressPage from "./pages/ProgressPage";
import ContactPage from "./pages/ContactPage";
import ReviewPage from "./pages/ReviewPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import RegisterPage from "./pages/RegisterPage";
import AdminPage from "./pages/AdminPage";
import AdminChallengePage from "./pages/AdminChallengePage";
import AdminIncidentPage from "./pages/AdminIncidentPage";
import AdminSocPage from "./pages/AdminSocPage";
import AdminInsightsPage from "./pages/AdminInsightsPage";
import AdminLearningPage from "./pages/AdminLearningPage";
import AdminReviewsPage from "./pages/AdminReviewsPage";
import AdminContactMessagesPage from "./pages/AdminContactMessagesPage";
import SocCasesPage from "./pages/SocCasesPage";
import SocCaseDetailsPage from "./pages/SocCaseDetailsPage";
import IncidentsPage from "./pages/IncidentsPage";
import IncidentDetailsPage from "./pages/IncidentDetailsPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/resend-verification" element={<ResendVerificationPage />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />

      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/challenges"
        element={
          <AdminRoute>
            <AdminChallengePage />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/incidents"
        element={
          <AdminRoute>
            <AdminIncidentPage />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/soc-cases"
        element={
          <AdminRoute>
            <AdminSocPage />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/insights"
        element={
          <AdminRoute>
            <AdminInsightsPage />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/learning"
        element={
          <AdminRoute>
            <AdminLearningPage />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/reviews"
        element={
          <AdminRoute>
            <AdminReviewsPage />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/contact-messages"
        element={
          <AdminRoute>
            <AdminContactMessagesPage />
          </AdminRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tutorials"
        element={
          <ProtectedRoute>
            <TutorialsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tutorials/course/:courseId"
        element={
          <ProtectedRoute>
            <CourseDetailsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tutorials/:id"
        element={
          <ProtectedRoute>
            <TutorialDetailsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/challenges"
        element={
          <ProtectedRoute>
            <ChallengesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/challenges/:id"
        element={
          <ProtectedRoute>
            <ChallengeDetailsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/soc-cases"
        element={
          <ProtectedRoute>
            <SocCasesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/soc-cases/:id"
        element={
          <ProtectedRoute>
            <SocCaseDetailsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/incidents"
        element={
          <ProtectedRoute>
            <IncidentsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/incidents/:id"
        element={
          <ProtectedRoute>
            <IncidentDetailsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/progress"
        element={
          <ProtectedRoute>
            <ProgressPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/review"
        element={
          <ProtectedRoute>
            <ReviewPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/contact"
        element={
          <ProtectedRoute>
            <ContactPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
