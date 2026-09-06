import HomeLoginButton from "@/components/HomeLoginButton";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-primary-bg p-6 text-center">
      <img src="/logo-mark.png" alt="에그팜" className="h-32 w-auto" />
      <p className="text-sm text-primary-dark">신선한 계란을 문 앞까지, 에그팜</p>
      <HomeLoginButton />
    </div>
  );
}
