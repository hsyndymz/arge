import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

export default function AdminPage() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");

  // Redirect if not admin
  if (!isAuthenticated || user?.role !== 'admin') {
    setLocation('/');
    return null;
  }

  const { data: users = [], isLoading, refetch } = (trpc as any).admin.getAllUsers.useQuery();
  const updateRoleMutation = (trpc as any).admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("Rol güncellendi");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Hata oluştu");
    },
  });

  const createUserMutation = (trpc as any).admin.createUser.useMutation({
    onSuccess: () => {
      toast.success("Kullanıcı başarıyla eklendi");
      setNewUserEmail("");
      setNewUserPassword("");
      setShowAddUserForm(false);
      setTimeout(() => refetch(), 500);
    },
    onError: (error: any) => {
      toast.error(error.message || "Hata oluştu");
    },
  });

  const deleteUserMutation = (trpc as any).admin.deleteUser.useMutation({
    onSuccess: () => {
      toast.success("Kullanıcı silindi");
      setDeletingUserId(null);
      setTimeout(() => refetch(), 500);
    },
    onError: (error: any) => {
      toast.error(error.message || "Hata oluştu");
    },
  });

  const handleRoleChange = (userId: number, newRole: "admin" | "user") => {
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  const handleDeleteUser = (userId: number) => {
    deleteUserMutation.mutate({ userId });
  };

  const handleAddUser = () => {
    if (!newUserEmail || !newUserPassword) {
      toast.error("Email ve şifre gerekli");
      return;
    }
    createUserMutation.mutate({ email: newUserEmail, password: newUserPassword });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Admin Paneli</h1>
          <p className="text-gray-600 mt-2">Kullanıcı yönetimi ve yetkilendirme</p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Kullanıcılar</CardTitle>
              <CardDescription>Tüm kayıtlı kullanıcıları yönetin</CardDescription>
            </div>
            <Button onClick={() => setShowAddUserForm(!showAddUserForm)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Kullanıcı Ekle
            </Button>
          </CardHeader>
          <CardContent>
            {showAddUserForm && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <Input
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="kullanici@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Şifre</label>
                    <Input
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleAddUser}
                      disabled={createUserMutation.isPending}
                      size="sm"
                    >
                      Ekle
                    </Button>
                    <Button
                      onClick={() => setShowAddUserForm(false)}
                      variant="outline"
                      size="sm"
                    >
                      İptal
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-8">Yükleniyor...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Kullanıcı bulunamadı</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ad</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Giriş Yöntemi</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Kayıt Tarihi</TableHead>
                      <TableHead>İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u: any) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name || "-"}</TableCell>
                        <TableCell>{u.email || "-"}</TableCell>
                        <TableCell className="text-sm">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {u.loginMethod || "email"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={u.role}
                            onValueChange={(value) =>
                              handleRoleChange(u.id, value as "admin" | "user")
                            }
                            disabled={u.id === user?.id}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">Kullanıcı</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {new Date(u.createdAt).toLocaleDateString("tr-TR")}
                        </TableCell>
                        <TableCell>
                          {u.id !== user?.id && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeletingUserId(u.id)}
                              disabled={deleteUserMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deletingUserId !== null} onOpenChange={() => setDeletingUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kullanıcı Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu kullanıcıyı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2">
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingUserId) handleDeleteUser(deletingUserId);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Sil
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
