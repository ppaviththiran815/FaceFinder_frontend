import AuthNotice from "@/components/auth/AuthNotice";
import AuthShell from "@/components/auth/AuthShell";

export default function Page() {
  return <AuthShell><AuthNotice kind="email-verification" /></AuthShell>;
}
