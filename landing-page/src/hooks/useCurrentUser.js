import { useState } from "react";
import { getCurrentUser } from "../utils/session";

export function useCurrentUser() {
  const [user] = useState(() => getCurrentUser());
  return user;
}
