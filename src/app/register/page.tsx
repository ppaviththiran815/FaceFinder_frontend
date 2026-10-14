import AuthNotice from "@/components/auth/AuthNotice";
import AuthShell from "@/components/auth/AuthShell";

export default function RegisterPage() {
  return <AuthShell><AuthNotice kind="registration-disabled" /></AuthShell>;
}
