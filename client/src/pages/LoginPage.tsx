import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getLoginUrl } from "@/const";
import { Chrome } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const loginUrl = getLoginUrl();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      toast.success("Giriş başarılı");
      await utils.auth.me.invalidate();
      setLocation("/");
    },
    onError: (err) => {
      setError(err.message);
      toast.error(err.message);
    }
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate({ email, password });
  };

  const handleGuestAccess = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Ocak Takip Sistemi</CardTitle>
          <CardDescription>Giriş yapın veya ziyaretçi olarak devam edin</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Adresi</Label>
              <Input
                id="email"
                type="email"
                placeholder="ornek@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Şifre</Label>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md border border-red-100">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? "Giriş Yapılıyor..." : "Giriş Yap"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">veya</span>
            </div>
          </div>

          <div className="space-y-3">
            <a href={loginUrl} className="block">
              <Button variant="outline" className="w-full">
                <Chrome className="mr-2 h-4 w-4" />
                Google ile Giriş Yap
              </Button>
            </a>

            <Button
              onClick={handleGuestAccess}
              variant="outline"
              className="w-full"
            >
              Ziyaretçi Olarak Devam Et
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
