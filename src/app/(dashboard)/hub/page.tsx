import { redirect } from "next/navigation";

// Discover now lives on the dashboard (/). Keep the old URL working.
export default function HubIndexRedirect() {
  redirect("/");
}
