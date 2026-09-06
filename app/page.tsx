import HomeLoginButton from "@/components/HomeLoginButton";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-white p-6 text-center">
      <img src="/logo.png" alt="에그팜" className="h-14 w-auto" />
      <HomeLoginButton />
    </div>
  );
}
