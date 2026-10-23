import { getIdToken } from "../auth/authService";

const API_BASE_URL = "http://localhost:8080";

export async function createUserProfile(profile: {
  username: string;
  firstName: string;
  lastName: string;
  phone?: string;
}) {
  const token = await getIdToken();

  const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(profile),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);

    throw new Error(
      error?.message || "Failed to create user profile"
    );
  }

  return response.json();
}