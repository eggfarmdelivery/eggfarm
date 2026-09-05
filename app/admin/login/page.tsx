import LoginForm from "./LoginForm";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-lg font-medium">관리자 콘솔</h1>
      <LoginForm />
    </div>
  );
}
