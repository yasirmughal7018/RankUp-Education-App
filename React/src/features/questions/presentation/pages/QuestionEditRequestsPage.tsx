/**
 * Legacy route — edit requests live on the Questions page.
 */
import { Navigate } from "react-router-dom";

export function QuestionEditRequestsPage() {
  return <Navigate to="/questions?view=edit-requests" replace />;
}
