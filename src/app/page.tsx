import AuthForm from "@/components/auth/AuthForm";
import AuthShell from "@/components/auth/AuthShell";

export default function Home() {
  return <AuthShell><AuthForm mode="login" /></AuthShell>;
}
